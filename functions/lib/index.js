"use strict";
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebaseHelper = require("firebase-functions-helper");
const express = require("express");
const bodyParser = require("body-parser");
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
exports.webApi = functions.https.onRequest(main);
// get the building tenants as a list of Tenants Info
app.get('/getBuildingTenants', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => __awaiter(this, void 0, void 0, function* () {
        const listoOfTenants = doc.tenantsUID;
        if (listoOfTenants.includes(req.query.uid)) {
            let listOfInfo = [];
            for (let i = 0; i < listoOfTenants.length; i++) {
                yield firebaseHelper.firestore.getDocument(db, usersCollection, listoOfTenants[i]).then((tenantInfo) => __awaiter(this, void 0, void 0, function* () {
                    listOfInfo.push(yield tenantInfo);
                }));
            }
            res.send(listOfInfo);
        }
        else {
            res.status(401).send("Access is denied you have to be a tenant in this building");
        }
    }));
});
// Get user information
app.get('/getUserInfo', (req, res) => {
    firebaseHelper.firestore
        .getDocument(db, usersCollection, req.query.uid)
        .then((doc) => res.status(200).send(doc));
});
// post bills to a building(Must be a manager)
app.post('/addBill', (req, res) => {
    if (Object.keys(req.body).length != 0) {
        if (req.body["amount"] && req.body["description"] && req.body["label"] && req.body["users"] && req.body["usersWhoPaid"] && req.body["dueTime"]) {
            firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
                .then((doc) => {
                let reqBody = {
                    "uid": "random",
                    "amount": req.body["amount"],
                    "description": req.body["description"],
                    "label": req.body["label"],
                    "users": req.body["users"],
                    "usersWhoPaid": req.body["usersWhoPaid"],
                    "dueTime": req.body["dueTime"],
                    "Currency": doc.Currency,
                };
                if (doc.manager === req.query.uid) {
                    const listoOfBills = doc.billsID;
                    // create a new bill in the collection
                    firebaseHelper.firestore.createNewDocument(db, billsCollection, reqBody).then((docRef) => {
                        let uidBody = {
                            "uid": docRef.id
                        };
                        firebaseHelper.firestore.updateDocument(db, billsCollection, docRef.id, uidBody);
                        listoOfBills.push(docRef.id);
                        const billsMap = { "billsID": listoOfBills };
                        // add the bill to the building
                        firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, billsMap);
                        res.status(200).send("A new bill is created");
                    });
                }
                else {
                    res.status(401).send("Access is denied");
                }
            });
        }
        else {
            res.status(401).send("Invalid request body ");
        }
    }
    else {
        res.status(401).send("Request body is empty");
    }
});
// post bills to a building repeating it for 3 months(Must be a manager)
app.post('/addBillRepeat', (req, res) => {
    if (Object.keys(req.body).length != 0) {
        if (req.body["amount"] && req.body["description"] && req.body["label"] && req.body["users"] && req.body["usersWhoPaid"] && req.body["dueTime"]) {
            firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
                .then((doc) => __awaiter(this, void 0, void 0, function* () {
                let array = req.body["dueTime"].split("|");
                let month = parseInt(array[0]);
                let year = parseInt(array[2]);
                let day = parseInt(array[1]);
                if (doc.manager === req.query.uid) {
                    let i = 0;
                    for (i = 0; i < 3; i++) {
                        let reqBody = {
                            "uid": "random",
                            "amount": req.body["amount"],
                            "description": req.body["description"],
                            "label": req.body["label"],
                            "users": req.body["users"],
                            "usersWhoPaid": req.body["usersWhoPaid"],
                            "dueTime": month.toString() + "|" + day.toString() + "|" + year.toString(),
                            "Currency": doc.Currency,
                        };
                        const listoOfBills = doc.billsID;
                        // create a new bill in the collection
                        yield firebaseHelper.firestore.createNewDocument(db, billsCollection, reqBody).then((docRef) => __awaiter(this, void 0, void 0, function* () {
                            let uidBody = {
                                "uid": docRef.id
                            };
                            yield firebaseHelper.firestore.updateDocument(db, billsCollection, docRef.id, uidBody);
                            yield listoOfBills.push(docRef.id);
                            const billsMap = yield { "billsID": listoOfBills };
                            // add the bill to the building
                            yield firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, billsMap);
                        }));
                        if (month >= 12) {
                            month = (month - 12) + 1;
                        }
                        else {
                            month = month + 1;
                        }
                    }
                    res.status(200).send("Bills are generated");
                }
                else {
                    res.status(401).send("Access is denied");
                }
            }));
        }
        else {
            res.status(401).send("Invalid request body ");
        }
    }
    else {
        res.status(401).send("Request body is empty");
    }
});
// Get remaining non occupied building appartments
app.get('/getNonOccupiedApartments', (req, res) => {
    firebaseHelper.firestore
        .getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager === req.query.uid) {
            let remaining = doc.numberofApartments - doc.tenantsUID.length;
            res.status(200).send(remaining.toString());
        }
        else {
            res.status(400).send("Access is denied");
        }
    });
});
// Update user information
app.patch('/editMyInfo', (req, res) => {
    if (req.body["buildings"] || req.body["phonenumber"]) {
        res.status(400).send("Some of these updates are not allowed");
    }
    else {
        firebaseHelper.firestore
            .updateDocument(db, contactsCollection, req.query.uid, req.body);
        res.status(200).send('You successfully updated your information');
    }
});
// Remove a building 
app.delete('/deleteBuilding', (req, res) => {
    let bID = req.query.buildingID;
    let uid = req.query.uid;
    firebaseHelper.firestore.getDocument(db, buildingsCollection, bID)
        .then((building) => __awaiter(this, void 0, void 0, function* () {
        // checking if the user if a manager
        if (building.manager == uid) {
            let tenants = yield building.tenantsUID;
            console.log(tenants);
            for (let i = 0; i < tenants.length; i++) {
                // update the list of building for each tenant
                console.log(tenants[i]);
                let indexb = 0;
                let buildings = [];
                let buildingsMap = {};
                yield firebaseHelper.firestore.getDocument(db, usersCollection, tenants[i])
                    .then((tenant) => __awaiter(this, void 0, void 0, function* () {
                    buildings = yield tenant.buildings;
                    console.log(buildings);
                    indexb = yield buildings.indexOf(bID, 0);
                    if (indexb > -1) {
                        yield buildings.splice(indexb, 1);
                    }
                    buildingsMap = { "buildings": buildings };
                    yield firebaseHelper.firestore.updateDocument(db, usersCollection, tenants[i], buildingsMap);
                }));
                firebaseHelper.firestore.deleteDocument(db, buildingsCollection, req.query.buildingID);
            }
            res.status(200).send("Building is successfully deleted");
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    }));
});
// Remove a tenant from building
app.delete('/RemoveTennat', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((building) => {
        // checking if the user if a manager
        if (building.manager == req.query.uid) {
            // update the list of tenants in the building
            let tenants = building.tenantsUID;
            let index = tenants.indexOf(req.query.tenantUID, 0);
            if (index > -1) {
                tenants.splice(index, 1);
            }
            let tenantsMap = { "tenantsUID": tenants };
            firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, tenantsMap);
            // update the list of building in the tenants
            firebaseHelper.firestore.getDocument(db, usersCollection, req.query.tenantUID)
                .then((tenant) => {
                let buildings = tenant.buildings;
                let indexb = buildings.indexOf(req.query.buildingID, 0);
                if (indexb > -1) {
                    buildings.splice(indexb, 1);
                }
                let buildingsMap = { "buildings": buildings };
                firebaseHelper.firestore.updateDocument(db, usersCollection, req.query.tenantUID, buildingsMap);
                res.status(200).send("Tenant is removed from building");
            });
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// Remove a bill 
app.delete('/deleteBill', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((building) => {
        // checking if the user if a manager
        if (building.manager == req.query.uid) {
            // update the list of bills of the building
            let Allbills = building.billsID;
            let index = Allbills.indexOf(req.query.billID, 0);
            if (index > -1) {
                Allbills.splice(index, 1);
            }
            let billsMap = { "billsID": Allbills };
            firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, billsMap);
            // delete the bill document
            firebaseHelper.firestore.deleteDocument(db, billsCollection, req.query.billID);
            res.status(200).send('Bill is deleted');
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// send a message to a tenant
app.patch('/SendAMessage', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager == req.query.uid) {
            firebaseHelper.firestore.getDocument(db, usersCollection, req.query.tenantUID)
                .then((tenant) => {
                firebaseHelper.firestore.getDocument(db, usersCollection, req.query.uid)
                    .then((manager) => {
                    let messages = tenant.messages;
                    messages.push(req.body.message + " (" + manager.fullName + " من)");
                    let usersWhoPaidMap = {
                        "messages": messages
                    };
                    firebaseHelper.firestore.updateDocument(db, usersCollection, req.query.tenantUID, usersWhoPaidMap);
                    res.status(200).send("Message is sent");
                });
            });
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// Update a bill: Mark a bill as paid by a tenant
app.patch('/MarkAsPaid', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager == req.query.uid) {
            firebaseHelper.firestore.getDocument(db, billsCollection, req.query.billID)
                .then((bill) => {
                let usersWhoPaid = bill.usersWhoPaid;
                usersWhoPaid.push(req.body.user);
                let usersWhoPaidMap = {
                    "usersWhoPaid": usersWhoPaid
                };
                firebaseHelper.firestore.updateDocument(db, billsCollection, req.query.billID, usersWhoPaidMap);
                res.status(200).send("Tenant is marked as paid");
            });
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// Update bulding reserved
app.patch('/updateBuildingReserved', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager == req.query.uid) {
            let reservedMap = {
                "reserved": req.body.reserved
            };
            if (req.body["reserved"]) {
                firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, reservedMap);
                res.status(200).send("You building reserve is successfully updated");
            }
            else {
                res.status(401).send("Invalid request body");
            }
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// Get Building Info using its ID
app.get('/getMyBuildingInfo', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => __awaiter(this, void 0, void 0, function* () {
        if (doc.tenantsUID.includes(req.query.uid)) {
            res.status(200).send(doc);
        }
        else {
            res.status(401).send("Access is denied you have to be a tenant in this building");
        }
    }));
});
// Add a building 
app.post('/CreateABuilding', (req, res) => {
    let reqBody = {
        "address": req.body.address,
        "billsID": [],
        "buildingName": req.body.buildingName,
        "Currency": req.body.Currency,
        "manager": req.query.uid,
        "reserved": 0,
        "tenantsUID": [req.query.uid],
        "numberofApartments": req.body.numberofApartments
    };
    if (req.body["address"] && req.body["buildingName"]
        && req.body["Currency"] && req.body["numberofApartments"]) {
        firebaseHelper.firestore.createNewDocument(db, buildingsCollection, reqBody).then((doc) => {
            firebaseHelper.firestore.getDocument(db, usersCollection, req.query.uid)
                .then((user) => {
                const listOfBuildings = user.buildings;
                listOfBuildings.push(doc.id);
                const buildingMap = { "buildings": listOfBuildings };
                firebaseHelper.firestore.updateDocument(db, usersCollection, req.query.uid, buildingMap);
                res.status(200).send("A new building is created");
            });
        });
    }
    else {
        res.status(401).send("Invalid Request Body");
    }
});
// Add a tenant to building 
app.patch('/AddATenant', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager == req.query.uid) {
            firebaseHelper.firestore.backup(db, usersCollection)
                .then((data) => {
                let docs = data["users"];
                for (const key in docs) {
                    if (docs[key].phonenumber == req.body.phoneNumber) {
                        const listoOfTenants = doc.tenantsUID;
                        const listOfBuildings = docs[key].buildings;
                        // check if the user is already in the building
                        if (listoOfTenants.indexOf(key) < 0) {
                            listoOfTenants.push(key);
                            listOfBuildings.push(req.query.buildingID);
                            const tenantsMap = { "tenantsUID": listoOfTenants };
                            const buildingMap = { "buildings": listOfBuildings };
                            // add the Tenant to the building
                            firebaseHelper.firestore.updateDocument(db, buildingsCollection, req.query.buildingID, tenantsMap);
                            // add the building to the user
                            firebaseHelper.firestore.updateDocument(db, usersCollection, key, buildingMap);
                            res.status(200).send("The tenant is added ");
                        }
                        else {
                            res.status(200).send("Already a tenant");
                        }
                    }
                }
                res.status(401).send("Phone number not found");
            });
        }
        else {
            res.status(401).send("Access is denied you have to be a manager in this building");
        }
    });
});
// check if a manager 
app.get("/checkIfAManager", (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => {
        if (doc.manager == req.query.uid) {
            res.status(200).send("true");
        }
        else {
            res.send(401).send("false");
        }
    });
});
// get my building bills 
app.get('/getMyBuildingBills', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => __awaiter(this, void 0, void 0, function* () {
        const listoOfBills = doc.billsID;
        if (doc.tenantsUID.includes(req.query.uid)) {
            let listOfInfo = [];
            for (let i = 0; i < listoOfBills.length; i++) {
                yield firebaseHelper.firestore.getDocument(db, billsCollection, listoOfBills[i]).then((BillInfo) => __awaiter(this, void 0, void 0, function* () {
                    if (BillInfo.users.indexOf(req.query.uid) > -1) {
                        listOfInfo.push(yield BillInfo);
                    }
                }));
            }
            res.send(listOfInfo);
        }
        else {
            res.status(401).send("Access is denied you have to be a tenant in this building");
        }
    }));
});
// Get the bill for the current month
app.get('/getMyMonthlyBuildingBills', (req, res) => {
    firebaseHelper.firestore.getDocument(db, buildingsCollection, req.query.buildingID)
        .then((doc) => __awaiter(this, void 0, void 0, function* () {
        const listoOfBills = doc.billsID;
        if (doc.tenantsUID.includes(req.query.uid)) {
            let listOfInfo = [];
            for (let i = 0; i < listoOfBills.length; i++) {
                yield firebaseHelper.firestore.getDocument(db, billsCollection, listoOfBills[i]).then((BillInfo) => __awaiter(this, void 0, void 0, function* () {
                    if (BillInfo.users.indexOf(req.query.uid) > -1) {
                        let array = BillInfo.dueTime.split("|");
                        let month = parseInt(array[0]);
                        let year = parseInt(array[2]);
                        if ((month == req.query.month && year == req.query.year)) {
                            listOfInfo.push(yield BillInfo);
                        }
                    }
                }));
            }
            res.send(listOfInfo);
        }
        else {
            res.status(401).send("Access is denied you have to be a tenant in this building");
        }
    }));
});
// Get Bill Info using its ID
app.get('/getBillInfo', (req, res) => {
    firebaseHelper.firestore.getDocument(db, billsCollection, req.query.billID)
        .then((doc) => __awaiter(this, void 0, void 0, function* () {
        res.status(200).send(doc);
    }));
});
//# sourceMappingURL=index.js.map