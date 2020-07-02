
License
-------
MIT License


# todo
- var->const
- same response
- code format
- exception


# error
- Topology was destroyed

#query
- and
    - {'title':'data1','view':5000}
- or
    - {$or:[{'title':'data1'},{'view':{$gt:5000}}]}
- and or 
    - {'view':{$gt:3000},$or:[{'title':'data1'},{'description':'this is data2'}]}
- time
    - {"inserted_at": {"$gt":ISODate("2019-05-29 0:0:0.000Z"),"$lt":ISODate("2019-05-30 0:0:0.000Z")}}    
    - "inserted_at":{"$gt":new Date(new Date(dateStr+" 8:00:00").toISOString()),"$lt":new Date(new Date(nextDateStr+" 8:00:00").toISOString())}
    
- { "qList": { $elemMatch: { "qid": 1, "reorderFlag": 0} } }
- { "qList.qid": 1, "qList.reorderFlag": 0}
- { "qList": { $elemMatch: { "qid": 1} } }
- { "qList": {$exists : true}, $where: 'this.qList.length>1' }    