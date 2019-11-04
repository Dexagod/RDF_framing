export class Literal{
  value : any;
  datatype : any;
  language : string;

  constructor(value : any, datatype: any, language:string) {
    this.value = value;
    this.datatype = datatype;
    this.language = language;
  }
}
