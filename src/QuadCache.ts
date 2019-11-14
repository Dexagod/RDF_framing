import { ReturnWrapper } from './ReturnWrapper';
import { identifier } from '@babel/types';
var ldfetch = require("ldfetch")

export class QuadCache{
  private fetcher = new ldfetch({})

  private subjectMap = new Map();

  private graphMap = new Map<any, any>(); // Map<graphId, Set([id1, id2, ...]) with ids of items in the graph
  private objectPerType = new Map<any, any>(); // Map<typeName, Set([id1, id2, ...]) with ids of items with the given type

  private processedIRIs = new Set();

  ignoreTerms =  new Set(['termType', 'value', 'id', 'equals', 'datatype'])

  currentFileIdentifier = 0

  async processId(id : string){
    try {
      let baseId = id.split("#")
      if (! this.processedIRIs.has(baseId[0])){
        console.log("fetching", baseId[0])
        console.time("adding file")
        this.processQuads( (await this.fetcher.get(id)).triples )
        this.processedIRIs.add(baseId[0])
        console.timeEnd("adding file")
      }
      return null;
    } catch {
      return null
    }
  }

  private updateQuadBlankNodes(quad : any){
    for (let key of Object.keys(quad)) {
      if (quad[key].termType === "BlankNode"){
        quad[key] = this.updateNodeValueOrId(quad[key])
      }
    }
    return quad
  }

  private updateNodeValueOrId(node: any){
    if (node.hasOwnProperty("id")){
      node["id"] = node["id"] + "file" + this.currentFileIdentifier
    }
    if (node.hasOwnProperty("value")){
      node["value"] = node["value"] + "file" + this.currentFileIdentifier
    }
    return node
  }

  private processQuads(quads : Array<any>){
    this.currentFileIdentifier ++;
    if (quads === null || quads === undefined || quads.length === undefined || quads.length === 0) {
      return;
    }
    for (let quad of quads){
      if (quad !== undefined && quad !== null){
        quad = this.updateQuadBlankNodes(quad)
        if (! this.checkQuadPresent(quad)){
          this.addToListMap(this.subjectMap, this.getIdOrValue(quad.subject), quad)
          if ( this.getIdOrValue(quad.predicate) === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
            this.addToSetMap(this.objectPerType, this.getIdOrValue(quad.object), this.getIdOrValue(quad.subject)) // Map<typename, [id1, id2, ...]>
          }
          if ( quad.graph.termType === "BlankNode" || quad.graph.termType === "NamedNode"){
            this.addToSetMap(this.graphMap, this.getIdOrValue(quad.graph), this.getIdOrValue(quad.subject))
          }
        }
      }
    }
  }

  private checkQuadPresent(quad : any) : boolean{
    if (this.subjectMap.has( this.getIdOrValue(quad.subject) )){
      for (let presentQuad of this.subjectMap.get(this.getIdOrValue(quad.subject))){
        try{
          if (presentQuad.equals(quad)){
            return true
          }
        } catch {
          if (
            (this.getIdOrValue(quad.object) === this.getIdOrValue(presentQuad.object)) &&
            (this.getIdOrValue(quad.predicate) === this.getIdOrValue(presentQuad.predicate)) &&
            (this.getIdOrValue(quad.graph) === this.getIdOrValue(presentQuad.graph)) &&
            (this.getIdOrValue(quad.subject) === this.getIdOrValue(presentQuad.subject))
          ){
            return true;
          }
        }
      } 
    }
    return false;
  }

  async getItemForId(id : any, connectOnlyBlankNodes : boolean = true) : Promise<ReturnWrapper>{
    if (! this.checkIdPresent(id)){
      await this.processId(id)
    }
    return this.getConnectedNodesForNode(id, connectOnlyBlankNodes)
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


  async getIndividualItemsForType(type : any, connectOnlyBlankNodes : boolean = true) : Promise<Map<any, ReturnWrapper> | null> {
    return await this.getIndividualItemsForGraphOrType(this.objectPerType, type, connectOnlyBlankNodes)
  }
  
  async getIndividualItemsForGraph(graphId : any, connectOnlyBlankNodes : boolean = true) :  Promise<Map<any, ReturnWrapper> | null>  {
    return await this.getIndividualItemsForGraphOrType(this.graphMap, graphId, connectOnlyBlankNodes)
  }

  async getIndividualItemsForGraphOrType(map : Map<any, any>, mapIdentifier : any, connectOnlyBlankNodes : boolean = true) : Promise<Map<any, ReturnWrapper> | null> {
    let returnMap = new Map();
    if (! map.has(identifier)) {return null}
    for (let id of map.get(mapIdentifier)){
      returnMap.set(id, await this.getItemForId(id, connectOnlyBlankNodes))
    }
    return returnMap
  }

  async getItemsForType(type : any, connectOnlyBlankNodes : boolean = true) : Promise<ReturnWrapper>{
    return await this.getAllItemsForGraphOrType(this.objectPerType, type, connectOnlyBlankNodes)
  }
  
  async getItemsForGraph(graphId : any, connectOnlyBlankNodes : boolean = true) : Promise<ReturnWrapper> {
    return await this.getAllItemsForGraphOrType(this.graphMap, graphId, connectOnlyBlankNodes)
  }

  async getAllItemsForGraphOrType(map : Map<any, any>, mapIdentifier : any, connectOnlyBlankNodes : boolean = true) : Promise<ReturnWrapper> {
    let objectList = new Array()
    let quadList = new Array()
    for (let id of map.get(mapIdentifier)){   
      let itemReturnWrapper = await this.getItemForId(id, connectOnlyBlankNodes)
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
      let returnWrapper : ReturnWrapper = {
        quads : quadsList,
        jsonld : node
      }
      return returnWrapper
    } else {
      passedIds = passedIds.concat(id)
    }

    if (this.graphMap.has(id)){
      let allItemsForGraph = await this.getItemsForGraph(id, onlyBlank)
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