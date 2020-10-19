import * as express from 'express'

declare module 'express-serve-static-core' {
  export interface Request {
    // TODO: this is an ex example user interface for the decorator
    user: Partial<{ username:string,email:string }>;
    contextId: string;
  }
}
