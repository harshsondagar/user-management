import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseDto } from "../dto/api-response";



export const ApiWrappedResponse = <Tmodel extends Type<any>>(model: Tmodel) => {
    return applyDecorators(ApiExtraModels(ApiResponseDto, model), ApiOkResponse({
        schema: {
            allOf: [
                { $ref: getSchemaPath(ApiResponseDto) },
                {
                    properties: {
                        data: { $ref: getSchemaPath(model) }
                    }
                }
            ]
        }
    }))
}
