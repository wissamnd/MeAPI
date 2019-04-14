

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as firebaseHelper from 'firebase-functions-helper';
import * as express from 'express';
import * as bodyParser from "body-parser";
admin.initializeApp(functions.config().firebase);
const db = admin.firestore(); 
const app = express();
const main = express();
const contactsCollection = 'users';
const usersCollection = "users";
const buildingsCollection = "buildings";
const billsCollection = "bills";
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));
// webApi is your functions name, and you will pass main as 
// a parameter
export const webApi = functions.https.onRequest(main);


// Add new contact
// app.post('/adduser', (req, res) => {
//     if(Object.keys(req.body).length != 0){
//         if(req.body["fullName"]&&req.body["email"]&&req.body["buildings"]&&req.body["uid"]
//         &&req.body["phonenumber"]&&req.body["traveling"]&&req.body["about"]
//         &&req.body["photo"]){
//             firebaseHelper.firestore.createNewDocument(db, usersCollection, req.body);
//             res.send(req.body.fullName);
//         }else{
//             res.send("Invalid request body ");
//         }
//     }else{
//         res.send("Request body is empty");
//     }
// })
// Update new contact
// app.patch('/contacts/:contactId', (req, res) => {
//     firebaseHelper.firestore
//         .updateDocument(db, contactsCollection, req.params.contactId, req.body);
//     res.send('Update a new contact');
// })



// get the building tenants as a list of Tenants Info
app.get('/getBuildingTenants',(req,res)=>{
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
            .then(async (doc:any)=> {
            const listoOfTenants = doc.tenantsUID;
            if(listoOfTenants.includes(req.query.uid)){
                let listOfInfo: any[] = [];

                for(let i = 0; i < listoOfTenants.length; i++){
                    await firebaseHelper.firestore.getDocument(db,usersCollection,listoOfTenants[i]).then(async (tenantInfo:any)=>
                    {
                        listOfInfo.push(await tenantInfo);
                    });   
                }
                res.send(listOfInfo);
            }else{
                res.status(401).send("Access is denied you have to be a tenant in this building");
            }
        }
        ); 

})

// Get user information
app.get('/getUserInfo', (req, res) => {
    firebaseHelper.firestore
        .getDocument(db, usersCollection, req.query.uid)
        .then((doc: any) => res.status(200).send(doc));
})

// post bills to a building(Must be a manager)
app.post('/addBill',(req,res) =>{
    if(Object.keys(req.body).length != 0){
        if(req.body["amount"]&&req.body["description"]&&req.body["label"]&&req.body["users"]&&req.body["usersWhoPaid"]&&req.body["dueTime"]){
            firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
            .then((doc:any)=> {
                let reqBody = {
                    "uid" : "random",
                    "amount": req.body["amount"],
                    "description": req.body["description"],
                    "label": req.body["label"],
                    "repeat": req.body["repeat"],
                    "users": req.body["users"],
                    "usersWhoPaid": req.body["usersWhoPaid"],
                    "dueTime": req.body["dueTime"],
                    "Currency": doc.Currency,
                }
            if(doc.manager === req.query.uid){
                const listoOfBills = doc.billsID;
                // create a new bill in the collection
                firebaseHelper.firestore.createNewDocument(db,billsCollection,reqBody).then((docRef:any)=>{
                    let uidBody={
                        "uid" : docRef.id
                    }
                    firebaseHelper.firestore.updateDocument(db,billsCollection,docRef.id,uidBody);
                    listoOfBills.push(docRef.id);
                    const billsMap = {"billsID": listoOfBills};
                    // add the bill to the building
                    firebaseHelper.firestore.updateDocument(db,buildingsCollection,req.query.buildingID,billsMap);
                    res.status(200).send("A new bill is created");
                });
            }else{
                res.status(401).send("Access is denied");
            }
        }
        ); 
        }else{
            res.status(401).send("Invalid request body ");
        }
    }else{
        res.status(401).send("Request body is empty");
    }
  
})

// Get remaining non occupied building appartments
app.get('/getNonOccupiedApartments', (req, res) => {
    firebaseHelper.firestore
        .getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc: any) => {
            if(doc.manager === req.query.uid){
                let remaining =  doc.numberofApartments - doc.tenantsUID.length;
                res.status(200).send(remaining.toString());
            }else{
                res.status(400).send("Access is denied");
            }
        });
})

// Update user information
app.patch('/editMyInfo', (req, res) => {
    if(req.body["buildings"]||req.body["phonenumber"]){
        res.status(400).send("Some of these updates are not allowed")
    }else{
        firebaseHelper.firestore
        .updateDocument(db, contactsCollection, req.query.uid, req.body);
        res.status(200).send('You successfully updated your information');
    }
    
})

// Remove a building 
app.delete('/deleteBuilding', (req, res) => {
    let bID = req.query.buildingID;
    let uid = req.query.uid;
    firebaseHelper.firestore.getDocument(db,buildingsCollection,bID)
    .then(async (building:any)=>{
        // checking if the user if a manager
        if(building.manager == uid){
            let tenants = await building.tenantsUID;
            console.log(tenants)
             for(let i = 0; i < tenants.length;i++){
                // update the list of building for each tenant
                console.log(tenants[i]);
                let indexb = 0;
                let buildings = [];
                let buildingsMap = {};

            await firebaseHelper.firestore.getDocument(db,usersCollection,tenants[i])
            .then(async (tenant:any)=>{
                buildings = await tenant.buildings;
                console.log(buildings)
                indexb = await buildings.indexOf(bID, 0);
                if (indexb > -1) {
                    await buildings.splice(indexb, 1);
                }
                buildingsMap = {"buildings": buildings};
                await firebaseHelper.firestore.updateDocument(db,usersCollection,tenants[i],buildingsMap)
            })
            firebaseHelper.firestore.deleteDocument(db,buildingsCollection,req.query.buildingID)
            }
            res.status(200).send("Building is successfully deleted")
            
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    })
   
})



// Remove a tenant from building
app.delete('/RemoveTennat', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((building:any)=>{
        // checking if the user if a manager
        if(building.manager == req.query.uid){
            // update the list of tenants in the building
            let tenants = building.tenantsUID;
            let index = tenants.indexOf(req.query.tenantUID, 0);
                if (index > -1) {
                    tenants.splice(index, 1);
                }
            let tenantsMap = {"tenantsUID": tenants};
            firebaseHelper.firestore.updateDocument(db,buildingsCollection,req.query.buildingID,tenantsMap);
            // update the list of building in the tenants
            firebaseHelper.firestore.getDocument(db,usersCollection,req.query.tenantUID)
            .then((tenant:any)=>{
                let buildings = tenant.buildings;
                let indexb = buildings.indexOf(req.query.buildingID, 0);
                if (indexb > -1) {
                    buildings.splice(indexb, 1);
                }
                let buildingsMap= {"buildings": buildings};
                firebaseHelper.firestore.updateDocument(db,usersCollection,req.query.tenantUID,buildingsMap)
                res.status(200).send("Tenant is removed from building")
            })
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    })
   
})




// Remove a bill 
app.delete('/deleteBill', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((building:any)=>{
        // checking if the user if a manager
        if(building.manager == req.query.uid){
            // update the list of bills of the building
            let Allbills = building.billsID;
            let index = Allbills.indexOf(req.query.billID, 0);
                if (index > -1) {
                    Allbills.splice(index, 1);
                }
            let billsMap = {"billsID": Allbills};
            firebaseHelper.firestore.updateDocument(db,buildingsCollection,req.query.buildingID,billsMap);
            // delete the bill document
            firebaseHelper.firestore.deleteDocument(db, billsCollection, req.query.billID);
            res.status(200).send('Bill is deleted');
            
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    })
   
})

// send a message to a tenant
app.patch('/SendAMessage', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((doc:any) =>{
        if(doc.manager == req.query.uid){
            firebaseHelper.firestore.getDocument(db,usersCollection,req.query.tenantUID)
            .then((tenant:any)=>{
                firebaseHelper.firestore.getDocument(db,usersCollection,req.query.uid)
                .then((manager:any)=>{
                    let messages = tenant.messages;
                    messages.push(req.body.message+" ("+manager.fullName+" من)");
                    let usersWhoPaidMap = {
                    "messages" : messages
                }
                firebaseHelper.firestore.updateDocument(db,usersCollection,req.query.tenantUID,usersWhoPaidMap)
                res.status(200).send("Message is sent");
                }
                );
                
            });
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");   
        }
    });
})


// Update a bill: Mark a bill as paid by a tenant
app.patch('/MarkAsPaid', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((doc:any) =>{
        if(doc.manager == req.query.uid){
            firebaseHelper.firestore.getDocument(db,billsCollection,req.query.billID)
            .then((bill:any)=>{
                let usersWhoPaid = bill.usersWhoPaid;
                usersWhoPaid.push(req.body.user);
                let usersWhoPaidMap = {
                    "usersWhoPaid" : usersWhoPaid
                }
                firebaseHelper.firestore.updateDocument(db,billsCollection,req.query.billID,usersWhoPaidMap)
                res.status(200).send("Tenant is marked as paid");
            });
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");   
        }
    });
})


// Update bulding reserved
app.patch('/updateBuildingReserved', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((doc:any) =>{
        if(doc.manager == req.query.uid){
            let reservedMap = {
                "reserved" : req.body.reserved
            }
            if(req.body["reserved"]){
                firebaseHelper.firestore.updateDocument(db,buildingsCollection,req.query.buildingID,reservedMap)
                res.status(200).send("You building reserve is successfully updated");
            }else{
                res.status(401).send("Invalid request body")
            }
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");   
        }
    });
})

// Get Building Info using its ID
app.get('/getMyBuildingInfo',(req,res)=>{
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
            .then(async (doc:any)=> {
            if(doc.tenantsUID.includes(req.query.uid)){
                res.status(200).send(doc);
            }else{
                res.status(401).send("Access is denied you have to be a tenant in this building");
            }
        }
        );
})

// Add a building 
app.post('/CreateABuilding',(req,res)=>{
    let reqBody = {
        "address" : req.body.address,
        "billsID" : [],
        "buildingName": req.body.buildingName,
        "Currency": req.body.Currency,
        "manager": req.query.uid,
        "reserved" : 0,
        "tenantsUID" : [req.query.uid],
        "numberofApartments": req.body.numberofApartments
    }
    if(req.body["address"]&&req.body["buildingName"]
    &&req.body["Currency"]&&req.body["numberofApartments"]){
        firebaseHelper.firestore.createNewDocument(db,buildingsCollection,reqBody).then((doc:any)=>{
            firebaseHelper.firestore.getDocument(db,usersCollection,req.query.uid)
        .then((user:any)=>{
            const listOfBuildings = user.buildings;
            listOfBuildings.push(doc.id)
            const buildingMap = {"buildings": listOfBuildings};
            firebaseHelper.firestore.updateDocument(db,usersCollection,req.query.uid,buildingMap);
            res.status(200).send("A new building is created");
        });
        });
        
    }else{
        res.status(401).send("Invalid Request Body");
    }
});


// Add a tenant to building 
app.patch('/AddATenant', (req, res) => {
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
    .then((doc:any) =>{
        if(doc.manager == req.query.uid){
            firebaseHelper.firestore.backup(db,usersCollection)
            .then((data:any)=>{
                let docs = data["users"];
                for(const key in docs){
                    if(docs[key].phonenumber == req.body.phoneNumber){
                        const listoOfTenants = doc.tenantsUID;
                        const listOfBuildings = docs[key].buildings;
                        // check if the user is already in the building
                        if(listoOfTenants.indexOf(key) < 0){
                            listoOfTenants.push(key);
                            listOfBuildings.push(req.query.buildingID);
                            const tenantsMap = {"tenantsUID":listoOfTenants};
                            const buildingMap = {"buildings": listOfBuildings};
                            // add the Tenant to the building
                            firebaseHelper.firestore.updateDocument(db,buildingsCollection,req.query.buildingID,tenantsMap);
                            // add the building to the user
                            firebaseHelper.firestore.updateDocument(db,usersCollection,key,buildingMap);
                            res.status(200).send("The tenant is added ");
                            
                        }else{
                            res.status(200).send("Already a tenant");
                        }
                    }
                }
                res.status(401).send("Phone number not found")
            });
            
        }else{
            res.status(401).send("Access is denied you have to be a manager in this building");   
        }
    });
})



// check if a manager 
app.get("/checkIfAManager" ,(req,res) =>{

    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
        .then((doc:any)=>{
            if(doc.manager == req.query.uid){
                res.status(200).send("true");
            }else{
                res.send(401).send("false");
            }
        })
})

// get my building bills 
app.get('/getMyBuildingBills',(req,res)=>{
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
            .then(async (doc:any)=> {
            const listoOfBills = doc.billsID;
            if(doc.tenantsUID.includes(req.query.uid)){
                let listOfInfo: any[] = [];

                for(let i = 0; i < listoOfBills.length; i++){
                    await firebaseHelper.firestore.getDocument(db,billsCollection,listoOfBills[i]).then(async (BillInfo:any)=>
                    {
                        if(BillInfo.users.indexOf(req.query.uid) > -1 ){
                            listOfInfo.push(await BillInfo);
                        }
                    });   
                }
                res.send(listOfInfo);
            }else{
                res.status(401).send("Access is denied you have to be a tenant in this building");
            }
        }
        );
})

// Get the bill for the current month
app.get('/getMyMonthlyBuildingBills',(req,res)=>{
    firebaseHelper.firestore.getDocument(db,buildingsCollection,req.query.buildingID)
            .then(async (doc:any)=> {
            const listoOfBills = doc.billsID;
            if(doc.tenantsUID.includes(req.query.uid)){
                let listOfInfo: any[] = [];
                for(let i = 0; i < listoOfBills.length; i++){
                    await firebaseHelper.firestore.getDocument(db,billsCollection,listoOfBills[i]).then(async (BillInfo:any)=>
                    {
                        if(BillInfo.users.indexOf(req.query.uid) > -1 ){
                            let array = BillInfo.dueTime.split("|");
                            let month  = parseInt(array[0]);
                            let year = parseInt(array[2]);
                            if((month == req.query.month && year == req.query.year)|| BillInfo.repeat){
                                listOfInfo.push(await BillInfo);
                            }
                        }
                    });   
                }
                res.send(listOfInfo);
            }else{
                res.status(401).send("Access is denied you have to be a tenant in this building");
            }
        }
        );
})


















