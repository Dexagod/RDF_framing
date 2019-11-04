import { Parser } from './Parser';
var fs = require("fs")
var axios = require("axios")
var ldfetch = require("ldfetch")

export class Fetcher{

  fetcher : any;
  parser : Parser;

  constructor(){
    this.parser = new Parser()
    this.fetcher = new ldfetch({})
  }

  async fetchNodeFromId(id : string) : Promise<any>{
    return this.fetchId(id, true);
  }

  async fetchCollectionFromId(id : string) : Promise<any>{
    return this.fetchId(id, false);
  }

  async fetchId(id : string , node : boolean) : Promise<any>{
    console.log("fetching" ,id)
    try{
      return this.fetcher.get(id) 
    } catch (error) {
      console.error(error) 
      throw new Error("Requested ID was not found on disk nor on the web!")
    } 
    // return node === true ? this.parser.parseNode(response) : this.parser.parseCollection(response)
  }
  async fetchHTTP(id : string) : Promise<any> {
    let response = await axios.get(id)
    return response.data
  }
    
}