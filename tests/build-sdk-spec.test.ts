import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSdkSpec,
  type OpenAPIResponse,
  type OpenAPISpec
} from "../src/index.js";

const sourceSpec: OpenAPISpec = {
  openapi: "3.1.0",
  info: {
    title: "Imgwire API",
    version: "1.0.0"
  },
  paths: {
    "/uploads": {
      get: {
        operationId: "listUploads",
        tags: ["uploads"],
        "x-codegen-sdk-pagination": "offset_pagination",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UploadList"
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["uploads"],
        "x-codegen-sdk-method-name": "create upload",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateUploadRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Upload"
                }
              }
            }
          }
        }
      }
    },
    "/admin/uploads": {
      get: {
        tags: ["admin"],
        "x-codegen-sdk-group-name": "admin uploads",
        "x-codegen-sdk-auth": "server_key",
        responses: {
          "200": {
            description: "OK"
          }
        }
      }
    },
    "/internal/health": {
      get: {
        tags: ["internal"],
        "x-codegen-sdk-stability": "internal",
        responses: {
          "200": {
            description: "OK"
          }
        }
      }
    },
    "/ignored": {
      get: {
        "x-codegen-sdk-ignore": true,
        responses: {
          "204": {
            description: "No Content"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Upload: {
        type: "object",
        properties: {
          metadata: {
            $ref: "#/components/schemas/UploadMetadata"
          }
        }
      },
      UploadList: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Upload"
        }
      },
      UploadMetadata: {
        type: "object",
        properties: {
          checksum: {
            type: "string"
          }
        }
      },
      CreateUploadRequest: { type: "object" },
      UnusedSchema: { type: "object" }
    }
  }
};

test("buildSdkSpec shapes a client SDK spec deterministically", async () => {
  const result = await buildSdkSpec({
    target: "python",
    source: sourceSpec
  });

  assert.deepEqual(Object.keys(result.paths), ["/uploads"]);
  assert.equal(
    result.paths["/uploads"]?.get?.operationId,
    "Uploads_listUploads"
  );
  assert.equal(
    result.paths["/uploads"]?.post?.operationId,
    "Uploads_createUpload"
  );
  assert.deepEqual(result.paths["/uploads"]?.get?.tags, ["Uploads"]);
  assert.equal(
    result.paths["/uploads"]?.get?.["x-codegen-sdk-pagination"],
    "offset_pagination"
  );
  const paginatedResponse = result.paths["/uploads"]?.get?.responses?.[
    "200"
  ] as OpenAPIResponse;
  assert.deepEqual(Object.keys(paginatedResponse.headers ?? {}), [
    "X-Limit",
    "X-Next-Page",
    "X-Page",
    "X-Prev-Page",
    "X-Total-Count"
  ]);
  assert.deepEqual(result.tags, [{ name: "Uploads" }]);
  assert.deepEqual(Object.keys(result.components?.schemas ?? {}), [
    "CreateUploadRequest",
    "Upload",
    "UploadList",
    "UploadMetadata"
  ]);
  const emittedSchemas = (result.components?.schemas ?? {}) as Record<
    string,
    unknown
  >;
  assert.equal(emittedSchemas["UnusedSchema"], undefined);

  const secondResult = await buildSdkSpec({
    target: "python",
    source: sourceSpec
  });

  assert.deepEqual(result, secondResult);
});

test("buildSdkSpec keeps server-auth operations for node targets", async () => {
  const result = await buildSdkSpec({
    target: "node",
    source: sourceSpec
  });

  assert.deepEqual(Object.keys(result.paths), ["/admin/uploads", "/uploads"]);
  assert.equal(
    result.paths["/admin/uploads"]?.get?.operationId,
    "AdminUploads_getAdminUploads"
  );
});

test("buildSdkSpec can retain internal operations when requested", async () => {
  const result = await buildSdkSpec({
    target: "node",
    source: sourceSpec,
    config: {
      includeInternal: true
    }
  });

  assert.deepEqual(Object.keys(result.paths), [
    "/admin/uploads",
    "/internal/health",
    "/uploads"
  ]);
});

test("strict mode rejects invalid vendor extensions", async () => {
  await assert.rejects(() =>
    buildSdkSpec({
      target: "js",
      source: {
        ...sourceSpec,
        paths: {
          "/broken": {
            get: {
              "x-codegen-sdk-auth": "invalid" as unknown as "server_key",
              responses: {
                "200": { description: "OK" }
              }
            }
          }
        }
      },
      config: {
        strict: true
      }
    })
  );
});

test("non-strict mode falls back when vendor extension values are invalid", async () => {
  const result = await buildSdkSpec({
    target: "js",
    source: {
      ...sourceSpec,
      paths: {
        "/fallback": {
          get: {
            tags: ["fallback"],
            "x-codegen-sdk-auth": "invalid" as unknown as "server_key",
            "x-codegen-sdk-pagination":
              "invalid" as unknown as "offset_pagination",
            "x-codegen-sdk-stability": "invalid" as unknown as "stable",
            responses: {
              "200": {
                description: "OK"
              }
            }
          }
        }
      }
    }
  });

  const operation = result.paths["/fallback"]?.get;
  assert.ok(operation);
  assert.equal(operation["x-codegen-sdk-pagination"], undefined);
  assert.equal(operation["x-codegen-sdk-stability"], undefined);
});

test("client_key operations are filtered out for server targets", async () => {
  const result = await buildSdkSpec({
    target: "node",
    source: {
      ...sourceSpec,
      paths: {
        "/client-only": {
          get: {
            tags: ["client-only"],
            "x-codegen-sdk-auth": "client_key",
            responses: {
              "200": {
                description: "OK"
              }
            }
          }
        }
      }
    }
  });

  assert.equal(result.paths["/client-only"], undefined);
});

test("legacy offset_headers pagination marker is normalized to offset_pagination", async () => {
  const result = await buildSdkSpec({
    target: "js",
    source: {
      ...sourceSpec,
      paths: {
        "/legacy": {
          get: {
            tags: ["legacy"],
            "x-codegen-sdk-pagination": "offset_headers",
            responses: {
              "200": {
                description: "OK"
              }
            }
          }
        }
      }
    }
  });

  assert.equal(
    result.paths["/legacy"]?.get?.["x-codegen-sdk-pagination"],
    "offset_pagination"
  );
  const legacyResponse = result.paths["/legacy"]?.get?.responses?.[
    "200"
  ] as OpenAPIResponse;
  assert.ok(legacyResponse.headers?.["X-Total-Count"]);
});

test("existing pagination headers are preserved and only missing ones are added", async () => {
  const result = await buildSdkSpec({
    target: "js",
    source: {
      ...sourceSpec,
      paths: {
        "/images": {
          get: {
            tags: ["images"],
            "x-codegen-sdk-pagination": "offset_pagination",
            responses: {
              "200": {
                description: "OK",
                headers: {
                  "X-Total-Count": {
                    description: "Server-provided total count description.",
                    schema: {
                      type: "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const response = result.paths["/images"]?.get?.responses?.[
    "200"
  ] as OpenAPIResponse;
  assert.equal(
    response.headers?.["X-Total-Count"]?.description,
    "Server-provided total count description."
  );
  assert.deepEqual(response.headers?.["X-Total-Count"]?.schema, {
    type: "string"
  });
  assert.ok(response.headers?.["X-Page"]);
  assert.ok(response.headers?.["X-Limit"]);
  assert.ok(response.headers?.["X-Prev-Page"]);
  assert.ok(response.headers?.["X-Next-Page"]);
});
