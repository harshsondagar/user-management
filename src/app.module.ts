
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TaskModule } from './task/task.module';
import path from 'path';
import { APP_GUARD } from '@nestjs/core';
import { maintenanceGuard } from './common/gaurds/maintainence-gaurd';
import { JwtGuard } from './auth/gurads/jwt.guard';

console.log("----", path.join(__dirname, "src/**/*-entity.{ts,js}"));

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
    load: [configuration]
  }), TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      type: 'postgres',
      host: config.get<string>('database.host'),
      port: config.get<number>('database.port'),
      username: config.get<string>('database.username'),
      password: config.get<string>('database.password'),
      database: config.get<string>('database.name'),
      autoLoadEntities: true,
      entities: [path.join(__dirname, "/**/*-entity.{ts,js}")],
      migrations: [__dirname + '/migration/*{.ts,.js}'],
      synchronize: true
    }),
  })
    , UserModule, AuthModule, TaskModule],
  controllers: [],
  providers: [AppService, {
    provide: APP_GUARD, useClass: JwtGuard
  }, {
      provide: APP_GUARD, useClass: maintenanceGuard
    }],
})
export class AppModule { }
