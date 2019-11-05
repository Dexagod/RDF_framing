import { Graph } from './Graph';

export class Parser{
  objectMap = new Map<any, any>();
  graphMap = new Map<any, any>();

  graphsFromItem = new Map<any, any>();

  objectPerId = new Map();
  objectPerType = new Map();

  processQuads(quads : Array<any>){
    let subjectMap = new Map<any, any>();
    let ids = new Set<any>();
  
    for (let quad of quads){
      this.addToListMap(subjectMap, quad.subject.value, quad)
      if (quad.subject.termType === "NamedNode") {
        ids.add(quad.subject.value)
      }
      if ( quad.graph.termType === "BlankNode" || quad.graph.termType === "NamedNode"){
        this.addToSetMap(this.graphMap, quad.graph.value, quad.subject.value)
      }
    }
    this.createObjects(subjectMap, ids);
  }

  getReverseConnections(id : any){
    return this.objectMap.get(id)
  }

  getItemForId(id : any) : object{
    return this.objectPerId.get(id)
  }

  getItemsForType(type : any) : Map<any, object>{
    return this.objectPerType.get(type)
  }

  getAvailableTypes() : Array<any>{
    return Array.from(this.objectPerType.keys())
  }

  getAvailableIds() : Array<any>{
    return Array.from(this.objectPerId.keys())
  }

  getAllItemsForGraph(graphId : any) : Array<any>{
    let objectList = new Array()
    for (let id of this.graphMap.get(graphId)){   
      objectList.push(this.objectPerId.get(id))
    }
    return objectList
  }

  checkItemContainedByGraph(itemId : any, graphId : any) : boolean{
    return this.graphMap.get(graphId).indexOf(itemId) !== -1
  }

  private createObjects(subjectMap : Map<any, any>, ids : Set<any>){
    for (let id of Array.from(ids.keys())){
      let foundObj = this.searchMatching(id, id, false, subjectMap)
      if (! this.objectPerId.has(id)){
        this.objectPerId.set(id, foundObj)
        if (foundObj.hasOwnProperty("@type")){
          this.addToListMap
          this.addToMapMap(this.objectPerType, foundObj["@type"].value, id, foundObj)
        } else if (foundObj.hasOwnProperty('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')){
          this.addToMapMap(this.objectPerType, foundObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'].value, id, foundObj)
        }
      }
    }
  }

  private searchMatching(baseId : string, id : string, blankNode : boolean, subjectMap : Map<any, any>) : any{
    let object : any = null;
    if (this.objectPerId.has(id)){
      object = this.objectPerId.get(id)
    } else {
      if (blankNode){
        object = {
          "termType" : "BlankNode",
        }
      } else {
        object = { 
          "id" : id,
        }
      }
    }
    if (subjectMap.has(id)){
      let quads = subjectMap.get(id);
      for (let quad of quads){
        if (quad.object.termType === "BlankNode") {
          object[quad.predicate.value] = this.searchMatching(baseId, quad.object.value, true, subjectMap)
        } else {
          if (quad.object.termType === "NamedNode") {
            this.addToSetMap(this.objectMap, quad.object.value, baseId)
          }
          object[quad.predicate.value] = quad.object
        }
      }

    } else if (this.graphMap.has(id)){
      this.addToListMap(this.graphsFromItem, id, baseId)
      return new Graph(id)
    } 
    return object; 
  }

  private addToListMap(listMap : Map<any, any>, key : any, value : any){
    if (listMap.has(key)){
      listMap.get(key).push(value)
    } else {
      listMap.set(key, [value])
    }
  }

  private addToSetMap(setMap : Map<any, any>, key : any, value : any){
    if (setMap.has(key)){
      setMap.get(key).add(value)
    } else {
      setMap.set(key, new Set([value]))
    }
  }
  private addToMapMap(mapMap : Map<any, any>, key1 : any, key2 : any, value : any){
    if (mapMap.has(key1)){
      mapMap.get(key1).set(key2, value)
    } else {
      let newMap = new Map();
      newMap.set(key2, value)
      mapMap.set(key1, newMap)
    }
  }
}