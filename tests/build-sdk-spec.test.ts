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
        "x-codegen-sdk-auth": "server",
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
      Upload: { type: "object" },
      UploadList: { type: "object" },
      CreateUploadRequest: { type: "object" }
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
              "x-codegen-sdk-auth": "invalid" as unknown as "server",
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
