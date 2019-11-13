import { QTOconverter } from '../src/QTOconverter';
import { QuadCache } from '../src/QuadCache';

// console.log(jsonld.expand("http://193.190.127.240/data/node0.jsonld"))
let collectionId = "http://193.190.127.240/data/node0.jsonld#collection"

let converter = new QuadCache();
describe('testing converter', () => {
  it('parsing Collections object', async () => {
    await converter.processId(collectionId)
    console.log( await converter.getAvailableIds() )
    console.log( await converter.getAvailableGraphIds() )
    console.log( await converter.getAvailableTypes() )

    let collectionItem = await converter.getConnectedBlankNodesForId(collectionId)
    console.log( await converter.getItemForId(collectionId) )

    // let collectionItemAll = await converter.getAllConnectedItemsForId(collectionId)
    // // console.log( await converter.getAllItemsForGraph('_:b0') )
    // console.log( collectionItemAll )
    // console.log()
    // console.log( converter.getAvailableIds() )

    // let allConnected = await converter.getAllConnectedItemsForId( 'http://193.190.127.240/data/node0.jsonld')
    // console.log(allConnected)
    // // let collectionobject =  await converter.getAllConnectedItemsForId(collectionId) 
    // // console.log(collectionobject)
    // console.log()
    // console.log(allConnected[ 'https://w3id.org/tree#hasChildRelation'][0])

  })
})


