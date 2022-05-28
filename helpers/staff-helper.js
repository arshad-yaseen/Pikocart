var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
var ObjectId = require("mongodb").ObjectId;

module.exports = {
    doStaffSignup: (staffData) => {
        return new Promise(async (resolve, reject) => {
          db.get()
            .collection(collections.STAFF_COLLECTION)
            .insertOne(staffData)
            .then((res) => {
              resolve(staffData._id);
            });
        });
      },
      getStaff: (staff_id) => {
        return new Promise(async (resolve,reject)=> {
            let staff = await db.get().collection(collections.STAFF_COLLECTION).findOne({_id:staff_id})
            resolve(staff)
        })
      },
      getStaffByEmail:(staffEmail)=> {
        return new Promise(async(resolve,reject)=> {
          let staff = await db.get().collection(collections.STAFF_COLLECTION).findOne({staff_email:staffEmail})
          resolve(staff)
        })
      },
      doLogin: (staffData,staffCode) => {
        return new Promise(async (resolve, reject) => {
          let user = await db
            .get()
            .collection(collections.STAFF_COLLECTION)
            .findOne({ staff_email: staffData.staff_email });
          if (user) {
            if(staffData.staff_code == staffCode){
              resolve(user)
            }else{
              reject("Incorrect staff code")
            }
          } else {
            reject("Staff not found");
          }
        });
      },
}