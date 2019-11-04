import { Fetcher } from '../src/Fetcher';
import { Parser } from '../src/Parser';
import { NamedNode } from '../src/Helpers/NodeAndGraphTypes/NamedNode';
import { Literal } from '../src/Helpers/NodeAndGraphTypes/Literal';

var jsonld = require("jsonld")

let gemeenteCollection = "http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld"
let gemeenteRootNode = 'http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0'

describe('Testing parsing', () => {
  let fetcher = new Fetcher();
  let parser = new Parser()



  // let collectionsObject = 
  // {
  //   "@type" : new NamedNode("http://www.w3.org/ns/hydra/core#Collection"),
  //   "tree:remainingItems" : Literal,
  //   "hydra:manages" : [],
  //   "hydra:view" : Literal
  // }

  let stopAtSoughtObjectId = false;


  it('parsing Collections object', () => {
    console.time("fetching")
    fetcher.fetchId(gemeenteRootNode, false).then( (quads : any) => {
      console.timeEnd("fetching")
      console.time("parsing")
      // let parsed = parser.parseTriplesByTypes(quads.triples, ["http://www.w3.org/ns/hydra/core#Collection", "https://w3id.org/tree#node"], stopAtSoughtObjectId)
      let parsed = parser.parseTriplesByIds(quads.triples,  new Set(['http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0']), stopAtSoughtObjectId)
      console.timeEnd("parsing")
      // parsed.get("https://w3id.org/tree#node").map((node : any) => {if (node["@id"] === 'http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0') console.log(node)})
      //parsed.get("https://w3id.org/tree#node").map((node : any) => {console.log(node["@id"])})
      console.log( parsed.get('http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0') )
      console.time("parsing2")
      jsonld.fromRDF(quads.triples).then( (e: any) => console.timeEnd("parsing2") )
      
    })
  })
});


// [
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode {
//       value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
//     },
//     object: NamedNode { value: 'http://www.w3.org/ns/hydra/core#Collection' },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'http://www.w3.org/ns/hydra/core#manages' },
//     object: Literal {
//       value: 'https://data.vlaanderen.be/ns/generiek#Gemeente',
//       datatype: [NamedNode],
//       language: ''
//     },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'http://www.w3.org/ns/hydra/core#manages' },
//     object: Literal {
//       value: 'https://data.vlaanderen.be/ns/adres#Gemeentenaam',
//       datatype: [NamedNode],
//       language: ''
//     },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'http://www.w3.org/ns/hydra/core#manages' },
//     object: Literal {
//       value: 'https://data.vlaanderen.be/ns/adres#Straatnaam',
//       datatype: [NamedNode],
//       language: ''
//     },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'http://www.w3.org/ns/hydra/core#manages' },
//     object: Literal {
//       value: 'https://data.vlaanderen.be/ns/adres#Adres',
//       datatype: [NamedNode],
//       language: ''
//     },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'http://www.w3.org/ns/hydra/core#view' },
//     object: NamedNode {
//       value: 'http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0'
//     },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Collection/GemeentePrefixCollection.jsonld'
//     },
//     predicate: NamedNode { value: 'https://w3id.org/tree#remainingItems' },
//     object: Literal { value: '1017', datatype: [NamedNode], language: '' },
//     graph: DefaultGraph { value: '' }
//   },
//   {
//     subject: NamedNode {
//       value: 'http://193.190.127.240/data/Gemeentes/fragment0.jsonld#0'
//     },
//     predicate: NamedNode {
//       value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
//     },
//     object: NamedNode { value: 'https://w3id.org/tree#node' },
//     graph: DefaultGraph { value: '' }
//   }
// ]

