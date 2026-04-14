import assert from "node:assert/strict";
import test from "node:test";

import { buildSdkSpec, type OpenAPISpec } from "../src/index.js";

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
        "x-codegen-sdk-pagination": "offset_headers",
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
