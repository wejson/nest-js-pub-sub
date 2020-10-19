import { createParamDecorator } from '@nestjs/common';

export const ContextId = createParamDecorator((data, { contextId }): string => contextId);
