import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { FileAccess } from './file-access.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string; // Original filename or a system-generated one

  @Column()
  storedFilename: string; // Actual filename on disk or in cloud storage

  @Column()
  path: string; // Path to the file on disk or key in cloud storage

  @Column()
  mimetype: string;

  @Column('bigint')
  size: number;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: true }) // Eager load owner for convenience
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => FileAccess, (fileAccess) => fileAccess.file)
  accesses: FileAccess[];
} 