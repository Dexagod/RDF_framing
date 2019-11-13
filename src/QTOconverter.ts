import { Graph } from './Graph';
var ldfetch = require("ldfetch")

export class QTOconverter{
  private fetcher = new ldfetch({})

  private objectMap = new Map<any, any>();
  private graphMap = new Map<any, any>();

  private objectPerId = new Map();
  private objectPerType = new Map();

  private processedIRIs = new Set();

  ignoreTerms =  new Set(['termType', 'value', 'id', 'equals', 'datatype'])

  async processId(id : string){
    try {
      let baseId = id.split("#")
      if (! this.processedIRIs.has(baseId[0])){
        console.log("fetching", baseId[0])
        this.processQuads( (await this.fetcher.get(id)).triples )
        this.processedIRIs.add(baseId[0])
      }
      return null;
    } catch {
      return null
    }
  }

  private processQuads(quads : Array<any>){
    if (quads === null || quads === undefined || quads.length === undefined || quads.length === 0) {
      return;
    }
    let subjectMap = new Map<any, any>();
    let nodeIds = new Set<any>();
  
    for (let quad of quads){
      if (quad !== undefined && quad !== null){
        this.addToListMap(subjectMap, this.getIdOrValue(quad.subject), quad)
        if (quad.subject.termType === "NamedNode" || quad.subject.termType === "BlankNode"){
          nodeIds.add(this.getIdOrValue(quad.subject))
        }
        if ( quad.graph.termType === "BlankNode" || quad.graph.termType === "NamedNode"){
          this.addToSetMap(this.graphMap, this.getIdOrValue(quad.graph), this.getIdOrValue(quad.subject))
        }
      }
    }
    this.createObjects(subjectMap, nodeIds);
  }

  async getItemForId(id : any){
    if (! this.checkIdPresent(id)){
      await this.processId(id)
    }
    return this.getConnectedBlankNodesForId(id)
    // return this.objectPerId.get(id)
  }

  getLoadedFiles(){
    return this.processedIRIs
  }

  getReverseConnections(id : any){
    return this.objectMap.get(id)
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
  
  getAvailableGraphIds() : Array<any>{
    return Array.from(this.graphMap.keys())
  }

  checkItemContainedByGraph(itemId : any, graphId : any) : boolean{
    return this.graphMap.get(graphId).indexOf(itemId) !== -1
  }

  async getAllItemsForGraph(graphId : any) {
    let objectList = new Array()
    for (let id of this.graphMap.get(graphId)){   
      objectList.push(await this.getItemForId(id))
    }
    return objectList
  }

  async getConnectedBlankNodesForId(id : any){
    return await this.getConnectedBlankNodesForNode(this.objectPerId.get(id))
  }

  async getConnectedBlankNodesForNode(node : any, passedIds : Array<any> = new Array()){
    let id = this.getIdOrValue(node);
    if (passedIds.indexOf(id) !== -1){
      return node;
    } else {
      passedIds.concat(this.getIdOrValue(node))
    }
    let returnNode = Object.assign(node)

    if (this.graphMap.has(id)){
      returnNode["@graph"] = await this.getAllItemsForGraph(id)
      return returnNode
    }

    let nodeProperties = Object.keys(returnNode)
    for (let property of nodeProperties){
      if (! this.ignoreTerms.has(property)){
        let propertyNodes = new Array()
        for (let propertyNode of node[property]){
          if (propertyNode.termType === "BlankNode"){
            propertyNodes.push(await this.getConnectedBlankNodesForNode(propertyNode, passedIds))
          } else {
            propertyNodes.push(propertyNode)
          }
        }
        returnNode[property] = propertyNodes
      }
    }
    return returnNode
  }

  async getAllConnectedItemsForId(id : any){
    let node = this.objectPerId.get(id)
    return await this._recursiveFillIds(node, new Array())
  }

  async getAllConnectedItemsForNode(node : any){
    return await this._recursiveFillIds(node, new Array())

  }
 
  private async _recursiveFillIds(node : any, passedIds : Array<any>) : Promise<any> {
    let id = this.getIdOrValue(node);
    if (passedIds.indexOf(id) !== -1){
      return node;
    } else {
      passedIds = passedIds.concat(id)
    }

    if (this.checkGraphIdPresent(id)){
      let graphList = []
      let graphIds = this.graphMap.get(id)
      for (let id of graphIds){
        let node = this.objectPerId.get(id)
        graphList.push(await this._recursiveFillIds(node, passedIds))
      }
      return graphList
    }
    
    // Node is not a graph node
    if (this.checkIdPresent(id)){
      node = await this.getItemForId(id)
    }
    let nodeProperties = Object.keys(node)
    for (let property of nodeProperties){
      if (! this.ignoreTerms.has(property)){
        let propertyNodes = new Array()
        for (let propertyNode of node[property]){
          propertyNodes.push(await this._recursiveFillIds(propertyNode, passedIds))
        }
        node[property] = propertyNodes
      }
    }
    return node
  }

  private createObjects(subjectMap : Map<any, any>, nodeIds : Set<any>){
    for (let id of Array.from(nodeIds.keys())){
      let foundObj = this.searchMatching(id, id, subjectMap, new Set(), null)
      this.objectPerId.set(id, foundObj)
      if (foundObj.hasOwnProperty("@type")){
        this.addToMapMap(this.objectPerType, this.getIdOrValue(foundObj["@type"][0]), id, foundObj)
      } else if (foundObj.hasOwnProperty('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')){
        this.addToMapMap(this.objectPerType, this.getIdOrValue(foundObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'][0]), id, foundObj)
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
            if (quad.object.termType === "NamedNode" || quad.object.termType === "BlankNode") {
              this.addToSetMap(this.objectMap, this.getIdOrValue(quad.object), baseId)
            }
            object[this.getIdOrValue(quad.predicate)].push(quad.object);
          }
        } else {
          if (quad.object.termType === "NamedNode" || quad.object.termType === "BlankNode") {
            this.addToSetMap(this.objectMap, this.getIdOrValue(quad.object), baseId)
          }
          object[this.getIdOrValue(quad.predicate)] = [ quad.object ];
        }
      }

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
      throw new Error("Triple " + object + " contains no id or value field")
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