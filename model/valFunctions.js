"use strict";
const sql = require('mssql')
const config = {
  user: process.env.sql_user,
  password: process.env.sql_password,
  server: process.env.sql_server, // You can use 'localhost\\instance' to connect to named instance
  database: process.env.sql_database,
  options: {
    encrypt: false // Use this if you're on Windows Azure
  }
}

/* Utility function to get SDDC info*/
function getSDDC(orgId, rToken, callback) {
  var request = require('request');
  //get auth token
  request.post({
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    form: {
      "refresh_token": rToken
    },
    url: "https://console.cloud.vmware.com/csp/gateway/am/api/auth/api-tokens/authorize"
  }, function(error, response, body) {
    var jsonStr = JSON.parse(body);
    var rToken = jsonStr.access_token;
    console.log("token-" + rToken);
    //return callback(rToken);
    //get sddc status
    var request = require('request');
    request.get({
      headers: {
        'csp-auth-token': rToken,
        'Content-Type': 'application/json'
      },
      url: "https://vmc.vmware.com/vmc/api/orgs/" + orgId + "/sddcs"
      //url: "https://vmc.vmware.com/vmc/api/orgs"
    }, function(error, response, body) {
      return callback(body);
    });
  });
}

//get refresh token for a customer poc
function getToken(customer, callback) {
  customer = customer.replace("&", "_");
  let sqlQuery;

  sqlQuery = `select org_id, refresh_token
                from dbo.tech_validation
                where customer_name like '%${customer}%'`;

  sql.connect(config, err => {
    console.log("connect error: " + err);

    new sql.Request().query(sqlQuery, (err, result) => {
      // ... error checks
      sql.close();
      console.log(result);
      return callback(result.recordset);
    })

  })

  sql.on('error', err => {
    console.log("on error:" + err);
  })
}

/* Utility function to get invite to create org */
function getInvite(callback) {
  var request = require('request');
  //get auth token
  request.post({
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    form: {
      "refresh_token": process.env.create_refresh_token
    },
    url: "https://console.cloud.vmware.com/csp/gateway/am/api/auth/api-tokens/authorize"
  }, function(error, response, body) {
    console.log("body-" + body);
    var jsonStr = JSON.parse(body);
    var rToken = jsonStr.access_token;
    //return callback(rToken);
    //request org invitation url
    var request = require('request');
    //console.log(rToken);
    request.post({
      headers: {
        'csp-auth-token': rToken,
        'Content-Type': 'application/json'
      },
      json: {
        //"preset_name": "CUSTOMER",
        "number_of_invitations": "1",
        "invitation_properties": {
          "defaultAwsRegions": "US_EAST_1,US_WEST_2,EU_WEST_2",
          "enableZeroCloudCloudProvider": "false",
          "skipSubscriptionCheck": "true",
          "enableAWSCloudProvider": "true",
          "accountLinkingOptional": "false",
          "enabledAvailabilityZones": "{\"us-east-1\":[\"iad6\",\"iad7\",\"iad12\"],\"us-west-2\":[\"pdx1\",\"pdx2\",\"pdx4\"],\"eu-west-2\":[\"lhr54\",\"lhr55\"]}",
          "sddcLimit": "1",
          "sla": "CUSTOMER",
          "orgType": "CUSTOMER_POC",
          "defaultHostsPerSddc": "4",
          "hostLimit": "6",
          "defaultIADDatacenter": "iad6",
          "defaultPDXDatacenter": "pdx4"
        },
        "funds_required": "false"
      },
      url: "https://vmc.vmware.com/vmc/api/operator/invitations/service-invitations"
    }, function(error, response, body) {
      //console.log("Invite - " + body);
      return callback(body);
    });
  });
}

//check to see if customer exists in tech validation table
function getCustomer(customer, callback) {
  customer = customer.replace("&", "_");
  let sqlQuery;

  sqlQuery = `select dbo.get_tech_validation_customer_fn('${customer}') AS result`;
  sql.connect(config, err => {
    console.log("connect error: " + err);
    new sql.Request().query(sqlQuery, (err, result) => {
      // ... error checks
      sql.close();
      console.log(result.recordset);
      return callback(result.recordset);
    })
  })

  sql.on('error', err => {
    console.log("on error:" + err);
  })
}

exports.getSDDC = getSDDC;
exports.getToken = getToken;
exports.getInvite = getInvite;
exports.getCustomer = getCustomer;
