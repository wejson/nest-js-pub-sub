import {ApiModelProperty} from '@nestjs/swagger/dist/decorators/api-model-property.decorator';
import {IsArray, IsString} from 'class-validator';

export class HelloworldResponse {
  @ApiModelProperty({example: 'hello world', default: 'hello world', type: 'string'})
  message: string;
}

export class ExampleApiRequest {

  @IsString()
  @ApiModelProperty({required: true, default: 'test-example-topic', type: 'string', example: 'test-example-topic'})
  topic: string;

  @IsArray()
  @ApiModelProperty({required: true, default: [], type: 'number', example: [1, 2, 3], isArray: true})
  data: number[];
}

export class ExampleApiResponse {
  @ApiModelProperty({type: 'string', example: '123344'})
  msgId: any;
  @ApiModelProperty({type: 'number', example: 6})
  sum: number;
}
