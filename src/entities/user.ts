import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { City } from "./city";
import { Cafe } from "./cafe";
import { Criteria } from "./types/criteria";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint", unique: true })
  tgId: number;

  @Column({ type: "jsonb" })
  criteria: Criteria;

  @ManyToOne(() => City, { nullable: true, onDelete: "SET NULL", eager: true })
  @JoinColumn({ name: "city_id" })
  city: City;

  @OneToMany(() => Cafe, (cafe) => cafe.owner)
  cafe: Cafe[];
}
