import { Stack, App, StackProps } from "@aws-cdk/core";
import {
  RestApi,
  Cors,
  DomainName,
  EndpointType,
  MockIntegration,
  CfnRestApi
} from "@aws-cdk/aws-apigateway";
import { Certificate } from "@aws-cdk/aws-certificatemanager";

class MyStack extends Stack {
  constructor(scope: App, id: string, props: StackProps) {
    super(scope, id);

    const restApi = new RestApi(this, "RestApi", {
      cloudWatchRole: true,
      deploy: true
    });

    restApi.root.addResource("test").addMethod("GET");

    const cfnApi = restApi.node.defaultChild as CfnRestApi;
    cfnApi.body = {
      openapi: "3.0.0",
      info: {
        title: "Two Hands REST API",
        version: "1.0.0"
      },
      servers: [
        {
          url: "https://api.example.com/v1"
        }
      ],
      tags: [
        {
          name: "choc",
          description: "Access to Chain of custody backend resources"
        },
        {
          name: "ledger",
          description: "Access to Blockchain network"
        },
        {
          name: "tally",
          description:
            "APIs for external Tally system to interact with TH system"
        },
        {
          name: "zoho",
          description:
            "APIs for external Zoho system to interact with TH system"
        },
        {
          name: "proxy",
          description: "Proxy APIs"
        },
        {
          name: "webhook",
          description: "Webhook APIs"
        }
      ],
      "x-amazon-apigateway-request-validators": {
        "params-only": {
          validateRequestBody: false,
          validateRequestParameters: true
        }
      },
      "x-amazon-apigateway-api-key-source": "HEADER",
      "x-amazon-apigateway-request-validator": "params-only",
      paths: {
        "/choc/case/details/{id}": {
          get: {
            summary: "Returns information about case",
            tags: ["choc"],
            parameters: [
              {
                in: "path",
                name: "id",
                schema: {
                  type: "string"
                },
                required: true,
                description: "Case Id"
              }
            ],
            security: [
              {
                sigv4: []
              }
            ],
            "x-amazon-apigateway-auth": {
              type: "AWS_IAM"
            },
            "x-amazon-apigateway-integration": {
              httpMethod: "GET",
              type: "http",
              requestParameters: {
                "integration.request.path.id": "method.request.path.id"
              },
              responses: {
                default: {
                  statusCode: "200"
                },
                ".*401.*": {
                  statusCode: "401"
                },
                ".*404.*": {
                  statusCode: "404"
                },
                ".*50.*": {
                  statusCode: "500"
                }
              },
              uri: "https://api.example.com/prod/contents/details/{id}"
            },
            responses: {
              "200": {
                $ref: "#/components/responses/Success"
              },
              "401": {
                $ref: "#/components/responses/Unauthorized"
              },
              "404": {
                $ref: "#/components/responses/NotFound"
              },
              "500": {
                $ref: "#/components/responses/InternalError"
              }
            }
          }
        },
        "/ledger/transaction/{id}": {
          get: {
            summary: "Returns events for given Tag Id",
            tags: ["ledger"],
            parameters: [
              {
                in: "path",
                name: "id",
                schema: {
                  type: "string"
                },
                required: true,
                description: "Tag id to get data for"
              }
            ],
            security: [
              {
                apiKeyAuth: []
              }
            ],
            "x-amazon-apigateway-integration": {
              httpMethod: "GET",
              type: "http",
              requestParameters: {
                "integration.request.path.id": "method.request.path.id"
              },
              responses: {
                default: {
                  statusCode: "200",
                  responseParameters: {
                    "method.response.header.Access-Control-Allow-Origin": "'*'",
                    "method.response.header.Access-Control-Allow-Headers": "'*'"
                  }
                },
                ".*403.*": {
                  statusCode: "403",
                  responseParameters: {
                    "method.response.header.Access-Control-Allow-Origin": "'*'",
                    "method.response.header.Access-Control-Allow-Headers": "'*'"
                  }
                },
                ".*50.*": {
                  statusCode: "500",
                  responseParameters: {
                    "method.response.header.Access-Control-Allow-Origin": "'*'",
                    "method.response.header.Access-Control-Allow-Headers": "'*'"
                  }
                }
              },
              uri: {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::ImportValue": "uat-twohands-cdk-ledger-app-api-url"
                    },
                    "transactions/{id}"
                  ]
                ]
              }
            },
            responses: {
              "200": {
                description: "Returns transactions for given Tag Id",
                headers: {
                  "Access-Control-Allow-Origin": {
                    schema: {
                      type: "string"
                    }
                  },
                  "Access-Control-Allow-Headers": {
                    schema: {
                      type: "string"
                    }
                  }
                },
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/LedgerData"
                    }
                  }
                }
              },
              "403": {
                description: "Forbidden",
                headers: {
                  "Access-Control-Allow-Origin": {
                    schema: {
                      type: "string"
                    }
                  },
                  "Access-Control-Allow-Headers": {
                    schema: {
                      type: "string"
                    }
                  }
                },
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Forbidden"
                    }
                  }
                }
              },
              "500": {
                description: "Internal Server Error",
                headers: {
                  "Access-Control-Allow-Origin": {
                    schema: {
                      type: "string"
                    }
                  },
                  "Access-Control-Allow-Headers": {
                    schema: {
                      type: "string"
                    }
                  }
                },
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/InternalError"
                    }
                  }
                }
              }
            }
          }
        },
        "/thisfish/event": {
          post: {
            security: [
              {
                apiKeyAuth: []
              }
            ],
            summary: "Submits events to Two Hands System",
            tags: ["tally", "webhook"],
            "x-amazon-apigateway-integration": {
              httpMethod: "POST",
              type: "http",
              uri: {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::ImportValue": "uat-twohands-cdk-tally-app-api-url"
                    },
                    "thisfish/event"
                  ]
                ]
              },
              responses: {
                default: {
                  statusCode: "200"
                },
                ".*204.*": {
                  statusCode: "204"
                },
                ".*403.*": {
                  statusCode: "403"
                },
                ".*400.*": {
                  statusCode: "400"
                },
                ".*411.*": {
                  statusCode: "411"
                },
                ".*50.*": {
                  statusCode: "500"
                }
              }
            },
            responses: {
              "200": {
                $ref: "#/components/responses/Success"
              },
              "204": {
                $ref: "#/components/responses/EmptyResponse"
              },
              "400": {
                $ref: "#/components/responses/BadRequest"
              },
              "403": {
                $ref: "#/components/responses/Forbidden"
              },
              "411": {
                $ref: "#/components/responses/NoLength"
              },
              "500": {
                $ref: "#/components/responses/InternalError"
              }
            }
          }
        },
        "/inventory/events": {
          post: {
            summary: "Submit Zoho inventory event to Two Hands system",
            tags: ["zoho", "webhook"],
            parameters: [
              {
                in: "query",
                name: "type",
                description: "Type of event that needs to be pushed",
                schema: {
                  type: "string"
                },
                required: true,
                example: "customers"
              },
              {
                in: "query",
                name: "id",
                description: "unique id of event ",
                schema: {
                  type: "string"
                },
                required: true,
                example: "00001"
              }
            ],
            "x-amazon-apigateway-integration": {
              httpMethod: "PUT",
              type: "http",
              requestParameters: {
                "integration.request.path.events":
                  "method.request.querystring.type",
                "integration.request.path.id": "method.request.querystring.id"
              },
              responses: {
                default: {
                  statusCode: "200"
                },
                ".*50.*": {
                  statusCode: "500"
                }
              },
              uri: {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::ImportValue": "uat-twohands-cdk-zoho-app-api-url"
                    },
                    "{events}/{id}"
                  ]
                ]
              }
            },
            responses: {
              "200": {
                description: "Event Successfully Submitted"
              },
              "500": {
                $ref: "#/components/responses/InternalError"
              }
            }
          }
        },
        "/inventory/{proxy+}": {
          "x-amazon-apigateway-any-method": {
            tags: ["zoho", "proxy"],
            parameters: [
              {
                name: "proxy",
                in: "path",
                required: true,
                schema: {
                  type: "string"
                }
              }
            ],
            security: [
              {
                apiKeyAuth: []
              }
            ],
            "x-amazon-apigateway-integration": {
              httpMethod: "ANY",
              type: "http_proxy",
              requestParameters: {
                "integration.request.path.proxy": "method.request.path.proxy",
                "integration.request.header.Authorization":
                  "'Zoho-authtoken SECURE_ZOHO_KEY'",
                "integration.request.querystring.authtoken":
                  "'SECURE_ZOHO_KEY'",
                "integration.request.querystring.organization_id": "'112'"
              },
              responses: {
                default: {
                  statusCode: "200"
                },
                ".*403.*": {
                  statusCode: "403"
                },
                ".*50.*": {
                  statusCode: "500"
                }
              },
              uri: "https://inventory.zoho.com/api/v1/{proxy}"
            },
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object"
                    }
                  }
                }
              },
              "403": {
                $ref: "#/components/responses/Forbidden"
              },
              "500": {
                $ref: "#/components/responses/InternalError"
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          sigv4: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            "x-amazon-apigateway-authtype": "awsSigv4"
          },
          apiKeyAuth: {
            type: "apiKey",
            name: "x-api-key",
            in: "header"
          }
        },
        responses: {
          Success: {
            description: "Request was successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Success"
                }
              }
            }
          },
          EmptyResponse: {
            description: "Empty Response is Returned",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/EmptyResponse"
                }
              }
            }
          },
          Forbidden: {
            description:
              "User does not have enough permission to access resource",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Forbidden"
                }
              }
            }
          },
          BadRequest: {
            description: "Request does not meet acceptance criteria",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BadRequest"
                }
              }
            }
          },
          NoLength: {
            description: "Body Length is required",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/NoLength"
                }
              }
            }
          },
          InternalError: {
            description: "Something went wrong when processing request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InternalError"
                }
              }
            }
          },
          Unauthorized: {
            description: "User does not have sufficient permissions",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Unauthorized"
                }
              }
            }
          },
          NotFound: {
            description: "Requested item does not exist",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/NotFound"
                }
              }
            }
          }
        },
        schemas: {
          Success: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            example: {
              message: "Success"
            }
          },
          EmptyResponse: {
            type: "object",
            example: {}
          },
          Forbidden: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "Forbidden"
            }
          },
          BadRequest: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "Unable to decode payload"
            }
          },
          NoLength: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "Could not save empty records"
            }
          },
          InternalError: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "Failed to save item"
            }
          },
          Unauthorized: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "User does not have sufficient permissions"
            }
          },
          NotFound: {
            type: "object",
            properties: {
              message: {
                type: "string"
              }
            },
            required: ["message"],
            example: {
              message: "Item does not exist"
            }
          },
          LedgerData: {
            type: "object"
          }
        }
      }
    };

    const customDomain = new DomainName(this, "DomainName", {
      certificate: Certificate.fromCertificateArn(
        this,
        "Certificate",
        "arn:aws:acm:us-east-1:00000000000:certificate/some-id"
      ),
      domainName: "ap.example.com",
      endpointType: EndpointType.REGIONAL
    });

    const basePathMapping = customDomain.addBasePathMapping(restApi, {
      basePath: "v1"
    });
    console.log("RestApi Unique Id: ", restApi.node.uniqueId);
    console.log("BasePathMapping Unique Id: ", basePathMapping.node.uniqueId);
  }
}

const app = new App();
new MyStack(app, "MyStack", {});
app.synth();
