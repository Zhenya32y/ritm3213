import React from 'react';
import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Leaf,
  Moon,
  Music,
  NotebookPen,
  PhoneOff,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import { HabitIconKey } from '../types/habit';

interface HabitIconProps {
  icon: HabitIconKey;
  className?: string;
}

export const HabitIcon: React.FC<HabitIconProps> = ({ icon, className = 'w-4 h-4' }) => {
  switch (icon) {
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'droplet':
      return <Droplet className={className} />;
    case 'footprints':
      return <Footprints className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'apple':
      return <Apple className={className} />;
    case 'dumbbell':
      return <Dumbbell className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'notebook-pen':
      return <NotebookPen className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'smartphone-off':
      return <PhoneOff className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'bike':
      return <Bike className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'target':
    default:
      return <Target className={className} />;
  }
};
