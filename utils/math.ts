import { Entity } from '../types';

export const checkCollision = (rect1: Entity, rect2: Entity): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
