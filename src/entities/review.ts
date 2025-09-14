import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";
import { Cafe } from "./cafe";
import { Criteria } from "./types/criteria";

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  text: string;

  @Column({ type: "jsonb" })
  criteria: Criteria;

  @ManyToOne(() => User, { nullable: false, onDelete: "SET NULL", eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Cafe, { eager: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "cafe_id" })
  cafe: Cafe;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "int", default: 0 })
  updateCount: number;
}
