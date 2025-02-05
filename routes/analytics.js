const url = require("url");
const uuid = require("uuid");
const { _setCorsHeaders } = require("../utils.js");
const AWS = require("aws-sdk");
let config = require("fs").existsSync("./config.json")
  ? require("../config.json")
  : null;

const accessKeyId = process.env.accessKeyId || config.accessKeyId;
const secretAccessKey = process.env.secretAccessKey || config.secretAccessKey;

const awsConfig = new AWS.Config({
  credentials: new AWS.Credentials({
    accessKeyId,
    secretAccessKey,
  }),
  region: "us-west-1",
});
const ddbd = new AWS.DynamoDB.DocumentClient(awsConfig);

const _handleAnalyticsRequest = async (req, res) => {
  const request = url.parse(req.url);
  const path = request.path.split("/");

  const contentId = path[1];
  const ownerAddress = path[2];
  const monetizationPointer = decodeURIComponent(path[3]);

  try {
    res = _setCorsHeaders(res);
    const { method } = req;
    if (method === "OPTIONS") {
      res.end();
    } else if (method === "GET") {
      res.end();
    } else if (method === "POST") {
      const bs = [];
      req.on("data", (d) => {
        bs.push(d);
      });
      req.on("end", async () => {
        try {
          const b = Buffer.concat(bs);
          const s = b.toString("utf8");
          const json = JSON.parse(s);

          const { amount, assetCode, assetScale } = json;

          const params = {
            TableName: "monetization",
            Item: {
              contentId,
              eventId: uuid.v1(),
              ownerAddress,
              monetizationPointer,
              amount,
              assetCode,
              assetScale,
              timestamp: Date.now(),
            },
          };

          ddbd.put(params, function (err, data) {
            if (err) {
              console.error(
                "Unable to add item. Error JSON:",
                JSON.stringify(err, null, 2)
              );
              res.end(JSON.stringify(err, null, 2));
            } else {
              console.log("Added item:", JSON.stringify(data, null, 2));
              res.end(JSON.stringify(data, null, 2));
            }
          });
        } catch (err) {
          console.log(err);
          res.statusCode = 500;
          res.end(err.stack);
        }
      });
    } else {
      res.statusCode = 404;
      res.end("not found");
    }
  } catch (err) {
    console.log(err);
    res.statusCode = 500;
    res.end(err.stack);
  }
};

module.exports = {
  _handleAnalyticsRequest,
};
