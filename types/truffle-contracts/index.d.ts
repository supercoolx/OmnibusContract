/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { AllowListContractContract } from "./AllowListContract";
import { MigrationsContract } from "./Migrations";
import { OmniBusContract } from "./OmniBus";
import { OwnableContract } from "./Ownable";

declare global {
  namespace Truffle {
    interface Artifacts {
      require(name: "AllowListContract"): AllowListContractContract;
      require(name: "Migrations"): MigrationsContract;
      require(name: "OmniBus"): OmniBusContract;
      require(name: "Ownable"): OwnableContract;
    }
  }
}

export {
  AllowListContractContract,
  AllowListContractInstance,
} from "./AllowListContract";
export { MigrationsContract, MigrationsInstance } from "./Migrations";
export { OmniBusContract, OmniBusInstance } from "./OmniBus";
export { OwnableContract, OwnableInstance } from "./Ownable";
