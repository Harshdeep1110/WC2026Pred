'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getFlag } from '@/lib/flags';

interface SortableGroupProps {
  groupName: string;
  teams: string[];
  isLocked: boolean;
  onChange: (newOrder: string[]) => void;
}

function SortableTeamRow({ team, position, isLocked }: { team: string; position: number; isLocked: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: team, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: isDragging ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
        border: '1px solid',
        borderColor: isDragging ? 'var(--accent-green)' : 'var(--border-primary)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '8px',
        boxShadow: isDragging ? 'var(--shadow-card)' : 'none',
      }}
    >
      <div style={{
        width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', fontSize: '0.8rem', fontWeight: 800,
        background: position === 1 ? 'var(--accent-gold)' : position === 2 ? '#C0C0C0' : 'var(--bg-primary)',
        color: position <= 2 ? '#000' : 'var(--text-primary)',
        border: position > 2 ? '1px solid var(--border-primary)' : 'none',
        flexShrink: 0
      }}>
        {position}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.95rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{getFlag(team)}</span>
        {team}
      </div>

      {!isLocked && (
        <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px', color: 'var(--text-muted)', touchAction: 'none' }}>
          {/* Drag Handle Icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </div>
      )}
    </div>
  );
}

export function SortableGroup({ groupName, teams, isLocked, onChange }: SortableGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = teams.indexOf(active.id as string);
      const newIndex = teams.indexOf(over.id as string);
      onChange(arrayMove(teams, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={teams} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {teams.map((team, index) => (
            <SortableTeamRow key={team} team={team} position={index + 1} isLocked={isLocked} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
