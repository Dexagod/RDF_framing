import { ReturnWrapper } from './ReturnWrapper';
var ldfetch = require("ldfetch")

export class QuadCache{
  private fetcher = new ldfetch({})

  private subjectMap = new Map();

  private graphMap = new Map<any, any>(); // Map<graphId, Set([id1, id2, ...]) with ids of items in the graph
  private objectPerType = new Map(); // Map<typeName, Set([id1, id2, ...]) with ids of items with the given type

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
    for (let quad of quads){
      if (quad !== undefined && quad !== null){
        this.addToListMap(this.subjectMap, this.getIdOrValue(quad.subject), quad)
        if ( this.getIdOrValue(quad.predicate) === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
          this.addToSetMap(this.objectPerType, this.getIdOrValue(quad.object), this.getIdOrValue(quad.subject)) // Map<typename, [id1, id2, ...]
        }
        if ( quad.graph.termType === "BlankNode" || quad.graph.termType === "NamedNode"){
          this.addToSetMap(this.graphMap, this.getIdOrValue(quad.graph), this.getIdOrValue(quad.subject))
        }
      }
    }
  }

  async getItemForId(id : any) : Promise<ReturnWrapper>{
    if (! this.checkIdPresent(id)){
      await this.processId(id)
    }
    return this.getConnectedBlankNodesForId(id)
  }

  getLoadedFiles(){
    return this.processedIRIs
  }

  checkIdPresent(id : any) : boolean {
    return this.subjectMap.get(id) !== undefined;
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
    return Array.from(this.subjectMap.keys())
  }
  
  getAvailableGraphIds() : Array<any>{
    return Array.from(this.graphMap.keys())
  }

  checkItemContainedByGraph(itemId : any, graphId : any) : boolean{
    return this.graphMap.get(graphId).indexOf(itemId) !== -1
  }

  async getAllItemsForGraph(graphId : any) : Promise<ReturnWrapper> {
    let objectList = new Array()
    let quadList = new Array()
    for (let id of this.graphMap.get(graphId)){   
      let itemReturnWrapper = await this.getItemForId(id)
      objectList = objectList.concat(itemReturnWrapper.jsonld)
      quadList = quadList.concat(itemReturnWrapper.quads)
    }
    let returnWrapper : ReturnWrapper = {
      quads : quadList,
      jsonld : objectList
    }
    return returnWrapper
  }

  async getConnectedBlankNodesForId(id : any) : Promise<ReturnWrapper>{
    return await this.getConnectedNodesForNode(id, true)
  }

  private async getConnectedNodesForNode(id : any, onlyBlank : boolean, passedIds : Array<any> = new Array()) : Promise<ReturnWrapper>{
    let node : any = { "id": id }
    let quadsList = Array();

    if (passedIds.indexOf(id) !== -1){
      return node;
    } else {
      passedIds = passedIds.concat(id)
    }

    if (this.graphMap.has(id)){
      let allItemsForGraph = await this.getAllItemsForGraph(id)
      node["@graph"] = allItemsForGraph.jsonld
      quadsList = quadsList.concat(allItemsForGraph.quads)
    }

    if (this.subjectMap.has(id)){
      for (let quad of this.subjectMap.get(id)){
        quadsList.push(quad)
        let predicateValue = this.getIdOrValue(quad.predicate)
        if ((onlyBlank === true && quad.object.termType === "BlankNode") || (onlyBlank === false && (quad.object.termType === "NamedNode" || quad.object.termType === "BlankNode"))){
          let nodeReturnWrapper = await this.getConnectedNodesForNode(this.getIdOrValue(quad.object), onlyBlank, passedIds)
          quadsList = quadsList.concat(nodeReturnWrapper.quads)
          if (node.hasOwnProperty(predicateValue)){
            node[predicateValue].push(nodeReturnWrapper.jsonld)
          } else {
            node[predicateValue] = [nodeReturnWrapper.jsonld]
          }
        } else {
          if (node.hasOwnProperty(predicateValue)){
            node[predicateValue].push(quad.object)
          } else {
            node[predicateValue] = [quad.object]
          }
        }
      }
    }
 
    let returnWrapper : ReturnWrapper = {
      quads : quadsList,
      jsonld : node
    }
    return returnWrapper
  }

  async getAllConnectedItemsForId(id : any) : Promise<ReturnWrapper>{
    return await this.getConnectedNodesForNode(id, false)
  }
 
  private getIdOrValue(object : any){
    if (object.hasOwnProperty("value")){
      return object["value"]
    } else if (object.hasOwnProperty("id")){
      return object["id"]
    } else {
      throw new Error("Triple " + object + " contains no id or value field")
    }
  }

  private addToSetMap(setMap : Map<any, any>, key : any, value : any){
    if (setMap.has(key)){
      setMap.get(key).add(value)
    } else {
      setMap.set(key, new Set([value]))
    }
  }
  private addToListMap(setMap : Map<any, any>, key : any, value : any){
    if (setMap.has(key)){
      setMap.get(key).push(value)
    } else {
      setMap.set(key, new Array(value))
    }
  }
}


/**
 * 
 * prupose is that when we request a resource of any kind, we get an item of the form:
 * {
 *    object: {}
 *    triplpes: []
 * }
 */