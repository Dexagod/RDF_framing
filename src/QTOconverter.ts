import { Graph } from './Graph';
var ldfetch = require("ldfetch")

export class QTOconverter{
  private fetcher = new ldfetch({})

  private objectMap = new Map<any, any>();
  private graphMap = new Map<any, any>();

  private graphsFromItem = new Map<any, any>();

  private objectPerId = new Map();
  private objectPerType = new Map();

  private processedIRIs = new Set();


  async processId(id : string){
    let baseId = id.split("#")
    if (! this.processedIRIs.has(baseId[0])){
      console.log("processing file:", id)
      this.processQuads( (await this.fetcher.get(id)).triples )
      this.processedIRIs.add(baseId[0])
    }
  }

  private processQuads(quads : Array<any>){
    if (quads === null || quads === undefined || quads.length === undefined || quads.length === 0) {
      return;
    }

    let subjectMap = new Map<any, any>();
    let ids = new Set<any>();
  
    for (let quad of quads){
      if (quad !== undefined && quad !== null){
        this.addToListMap(subjectMap, this.getIdOrValue(quad.subject), quad)
        if (quad.subject.termType === "NamedNode") {
          ids.add(quad.subject.value)
        }
        if ( quad.graph.termType === "BlankNode" || quad.graph.termType === "NamedNode"){
          this.addToSetMap(this.graphMap, this.getIdOrValue(quad.graph), this.getIdOrValue(quad.subject))
        }
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

  checkIdPresent(id : any) : boolean {
    return this.objectPerId.get(id) !== undefined;
  }

  checkGraphIdPresent(id : any) : boolean {
    return this.graphMap.get(id) !== undefined;
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

  getAllConnectedItemsForId(id : any){
    let node = this.objectPerId.get(id)
    return this._recursiveFillIds(node, new Array())

  }
  getAllConnectedItemsForNode(node : any){
    return this._recursiveFillIds(node, new Array())

  }

  ignoreTerms =  new Set(['termType', 'value', 'id', 'equals'])
  private _recursiveFillIds(node : any, passedIds : Array<any>){
    console.log(node)
    let id = this.getIdOrValue(node);
    if (passedIds.indexOf(id) !== -1){
      return node;
    }

    if (this.checkGraphIdPresent(id)){
      let graphList = []
      let graphIds = [this.getAllItemsForGraph(id)]
      for (let id of graphIds){
        let node = this.objectPerId.get(id)
        graphList.push(this._recursiveFillIds(node, passedIds.concat(id)))
      }
    }
    
    // Node is not a graph node
    if (this.checkIdPresent(id)){
      node = this.getItemForId(id)
    }
    let nodeProperties = Object.keys(node)
    for (let property of nodeProperties){
      let propertyNodes = new Array()
      for (let propertyNode of property){
        if (! this.ignoreTerms.has(property)){
          propertyNodes.push(this._recursiveFillIds(propertyNode, passedIds.concat(id)))
        }
      }
      node[property] = propertyNodes
    }

  }

  private createObjects(subjectMap : Map<any, any>, ids : Set<any>){
    for (let id of Array.from(ids.keys())){
      let foundObj = this.searchMatching(id, id, subjectMap, new Set(), null)
      if (! this.objectPerId.has(id)){
        this.objectPerId.set(id, foundObj)
        if (foundObj.hasOwnProperty("@type")){
          this.addToMapMap(this.objectPerType, this.getIdOrValue(foundObj["@type"][0]), id, foundObj)
        } else if (foundObj.hasOwnProperty('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')){
          this.addToMapMap(this.objectPerType, this.getIdOrValue(foundObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'][0]), id, foundObj)
        }
      }
    }
  }

  private searchMatching(baseId : string, id : string, subjectMap : Map<any, any>, visitedIds : Set<any>, object : any) : any{
    if (visitedIds.has(id)){
      return object
    } else {
      visitedIds.add(id)
    }
    if (this.objectPerId.has(id)){
      object = this.objectPerId.get(id)
    } 
    if (subjectMap.has(id)){
      let quads = subjectMap.get(id);
      if (object === null || object === undefined) {object = quads[0].subject}

      let newaddition = true;
      for (let quad of quads){
        newaddition = true;
        if (object.hasOwnProperty(this.getIdOrValue(quad.predicate))) {
          for (let obj of object[this.getIdOrValue(quad.predicate)]){
            if (this.getIdOrValue(obj) === this.getIdOrValue(quad.object)){
              newaddition = false;
              break;
            }
          }
          if (newaddition === true) {
            if (quad.object.termType === "BlankNode") {
              object[this.getIdOrValue(quad.predicate)].push(this.searchMatching(baseId, this.getIdOrValue(quad.object), subjectMap, visitedIds, quad.object));
            } else {
              if (quad.object.termType === "NamedNode") {
                this.addToSetMap(this.objectMap, this.getIdOrValue(quad.object), baseId)
              }
              object[this.getIdOrValue(quad.predicate)].push(quad.object);
            }
          }
        } else {
          if (quad.object.termType === "BlankNode") {
            object[this.getIdOrValue(quad.predicate)] = [ this.searchMatching(baseId, this.getIdOrValue(quad.object), subjectMap, visitedIds, quad.object) ];
          } else {
            if (quad.object.termType === "NamedNode") {
              this.addToSetMap(this.objectMap, this.getIdOrValue(quad.object), baseId)
            }
            object[this.getIdOrValue(quad.predicate)] = [ quad.object ];
          }
        }
      }

    } else if (this.graphMap.has(id)){
      this.addToListMap(this.graphsFromItem, id, baseId)
      return new Graph(id)
    } 
    return object; 
  }

  private getIdOrValue(object : any){
    if (object.hasOwnProperty("value")){
      if (! object.hasOwnProperty("id")){ Object.defineProperty(object, "id", {value: object["value"], writable: true}) }
      return object["value"]
    } else if (object.hasOwnProperty("id")){
      if (! object.hasOwnProperty("value")){ Object.defineProperty(object, "value", {value: object["id"], writable: true}) }
      return object["id"]
    } else {
      throw new Error("Triple " + object.toString() + " contains no id or value field")
    }
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