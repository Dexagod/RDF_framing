export class Parser{
  parseTriplesByTypes(quads : Array<any>, types : Array<any>, stopAtSoughtObjectId : boolean){
    let triplesMap = new Map();
    let graphMap = new Map();
    let typeObjectIds = new Map();
    let soughtIds = new Set()
    for (let type of types){
      typeObjectIds.set(type, new Array())
    }
    for (let quad of quads){
      if (quad.graph.termType === "BlankNode"){
        if (graphMap.has(quad.graph.value)){
          graphMap.get(quad.graph.value).push(quad)
        } else {
          graphMap.set(quad.graph.value, [quad])
        }
      }
      if (triplesMap.has(quad.subject.value)){
        triplesMap.get(quad.subject.value).push(quad)
      } else {
        triplesMap.set(quad.subject.value, [quad])
      }
      if (quad.predicate.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
        let index = types.indexOf(quad.object.value)
        if (index !== -1) {
          soughtIds.add(quad.subject.value)
          typeObjectIds.get(quad.object.value).push(quad.subject.value)
        }
      } 
    }
    let returnTypeObjects = new Map()
    for(let type of types){
      let returnObjects = new Array()
      for (let id of typeObjectIds.get(type)){
        let foundObject = this.searchMatching(id, [], soughtIds, triplesMap, graphMap, stopAtSoughtObjectId)
        returnObjects.push(foundObject)
      }
      returnTypeObjects.set(type, returnObjects);
    }
    return returnTypeObjects
  }

  parseTriplesByIds(quads : Array<any>, soughtIds : Set<any>, stopAtSoughtObjectId : boolean){
    let triplesMap = new Map();
    let graphMap = new Map();

    for (let quad of quads){
      if (quad.graph.termType === "BlankNode"){
        if (graphMap.has(quad.graph.value)){
          graphMap.get(quad.graph.value).push(quad)
        } else {
          graphMap.set(quad.graph.value, [quad])
        }
      }
      if (triplesMap.has(quad.subject.value)){
        triplesMap.get(quad.subject.value).push(quad)
      } else {
        triplesMap.set(quad.subject.value, [quad])
      }
    }
    let returnObjects = new Map();
    for (let id of Array.from(soughtIds.values())){
      let foundObject = this.searchMatching(id, [], soughtIds, triplesMap, graphMap, stopAtSoughtObjectId)
      returnObjects.set(id, foundObject)
    }
     
    return returnObjects
  }

  searchMatching(id : string, foundIds : Array<any>, soughtIds : Set<any>, triplesMap : Map<any, any>, graphMap : Map<any, any>, stopAtSoughtObjectId : boolean) : any{
    let quads = triplesMap.get(id);
    if (quads === null || quads === undefined){
      return (new Object({"@id" : id}))
    }
    let currentObject : any = new Object({"@id" : id})
    for (let quad of quads){
      if(quad.object.termType === "Literal"){
        currentObject[quad.predicate.value] = quad.object.value;
      } else {
        if ( ( stopAtSoughtObjectId && soughtIds.has(quad.object.value))  || foundIds.indexOf(quad.object.value) !== -1){
          currentObject[quad.predicate.value] = new Object({"@id" : quad.object.value})
        } else { 
          currentObject[quad.predicate.value] = this.searchMatching(quad.object.value, foundIds.concat(id), soughtIds, triplesMap, graphMap, stopAtSoughtObjectId)
        }
      }
    }

    return currentObject
  }
}