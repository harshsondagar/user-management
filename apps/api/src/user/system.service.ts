import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { System } from "@app/shared"
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class SystemService {
    constructor(@InjectRepository(System) private readonly systemRepository: Repository<System>) { }


    async toggleMaintaineneceMode(enabled: boolean) {
        return this.systemRepository.upsert({ Key: 'maintenance_mode', value: String(enabled) }, ['Key'])
    }

    async IsMaintenanceModeActive() {

        const [setting] = await this.systemRepository.find({ where: { Key: 'maintenance_mode' } })


        if (!setting) {
            return false;
        }

        return setting.value
    }

}