export type SDKTarget =
  | "js"
  | "node"
  | "python"
  | "go"
  | "ruby"
  | "java"
  | "csharp"
  | "ios"
  | "android";

export type BuildConfig = {
  includeInternal?: boolean;
  strict?: boolean;
  debug?: boolean;
};

export type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

export type OpenAPIParameter = {
  name: string;
  in: string;
  required?: boolean;
  schema?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OpenAPIOperation = {
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  summary?: string;
  description?: string;
  "x-codegen-sdk-group-name"?: string;
  "x-codegen-sdk-method-name"?: string;
  "x-codegen-sdk-ignore"?: boolean;
  "x-codegen-sdk-auth"?: "server" | "client" | "both";
  "x-codegen-sdk-pagination"?: "offset_headers" | "offset_pagination";
  "x-codegen-sdk-stability"?: "stable" | "beta" | "internal" | "deprecated";
  [key: string]: unknown;
};

export type OpenAPIPathItem = {
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  [key: string]: unknown;
};

export type OpenAPIHeader = {
  description?: string;
  schema?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OpenAPIResponse = {
  description?: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OpenAPISpec = {
  openapi: string;
  info: {
    title: string;
    version: string;
    [key: string]: unknown;
  };
  servers?: Array<Record<string, unknown>>;
  paths: Record<string, OpenAPIPathItem>;
  components?: Record<string, unknown>;
  tags?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type SchemaRef =
  | {
      type: "requestBody";
      ref?: string;
      contentTypes: string[];
    }
  | {
      type: "response";
      statusCode?: string;
      ref?: string;
      contentTypes: string[];
    }
  | null;

export type SDKMethod = {
  name: string;
  operationId: string;
  http: {
    method: HttpMethod;
    path: string;
  };
  auth: "server" | "client" | "both";
  pagination?: "offset_headers" | "offset_pagination";
  stability?: "stable" | "beta" | "internal" | "deprecated";
  request: SchemaRef;
  response: SchemaRef;
  tags: string[];
  sourceOperation: OpenAPIOperation;
  resourceName: string;
};

export type SDKResource = {
  name: string;
  methods: SDKMethod[];
};

export type SDK = {
  resources: SDKResource[];
};

export type BuildSdkSpecOptions = {
  target: SDKTarget;
  source: string | OpenAPISpec;
  config?: BuildConfig;
};
