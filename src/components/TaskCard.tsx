import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Edit3,
  Quote,
  Trash2,
  X,
} from 'lucide-react';
import { ExtractedTask, TaskPriority } from '../types';

interface TaskCardProps {
  task: ExtractedTask;
  onToggleComplete: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<ExtractedTask, 'title' | 'description' | 'deadline' | 'priority'>
    >
  ) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onUpdate(task.id, {
      title: cleanTitle,
      description: description.trim(),
      deadline: deadline.trim() ? deadline.trim() : null,
      priority,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description);
    setDeadline(task.deadline || '');
    setPriority(task.priority);
    setIsEditing(false);
  };

  const priorityLabelMap: Record<
    TaskPriority,
    { text: string; className: string }
  > = {
    high: {
      text: 'High Priority',
      className: 'text-[#F87171]',
    },
    medium: {
      text: 'Medium Priority',
      className: 'text-[#FF9A35]',
    },
    low: {
      text: 'Low Priority',
      className: 'text-[#4ADE80]',
    },
    unspecified: {
      text: 'Priority Unspecified',
      className: 'text-[#71717A]',
    },
  };

  const originLabelMap: Record<ExtractedTask['sourceOrigin'], string> = {
    'live-ollama': 'Extracted via Local Model',
    manual: 'Added Manually',
    'demo-sample': 'Demo Sample Task',
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-colors ${
        task.completed
          ? 'border-white/[0.05] bg-[#0B0B0C]/60 opacity-75'
          : 'border-white/[0.08] bg-[#0B0B0C] hover:border-white/15'
      }`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] focus:outline-none focus:border-[#FF9A35]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
              Description / Context
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] focus:outline-none focus:border-[#FF9A35]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Explicit Deadline (Leave blank if none)
              </label>
              <input
                type="text"
                value={deadline}
                placeholder="e.g., October 24, 2026"
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] focus:outline-none focus:border-[#FF9A35]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] focus:outline-none focus:border-[#FF9A35]"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Task</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggleComplete(task.id)}
              aria-label={`Mark "${task.title}" as completed`}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060606] accent-[#FF6B1A] cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <h4
                className={`text-sm font-semibold ${
                  task.completed
                    ? 'line-through text-[#71717A]'
                    : 'text-[#F5F5F5]'
                }`}
              >
                {task.title}
              </h4>
              {task.description && (
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                  {task.description}
                </p>
              )}

              {task.sourceEvidence && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#71717A] italic">
                  <Quote className="w-3 h-3 shrink-0 text-[#FF9A35]" />
                  <span>Source: &ldquo;{task.sourceEvidence}&rdquo;</span>
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                <span
                  className={`font-medium ${priorityLabelMap[task.priority].className}`}
                >
                  {priorityLabelMap[task.priority].text}
                  {task.prioritySource && task.prioritySource !== 'none'
                    ? ` (${task.prioritySource})`
                    : ''}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#A1A1AA]">
                  <Calendar className="w-3 h-3 shrink-0 text-[#FF9A35]" />
                  <span className="font-mono tabular-nums">
                    {task.deadline
                      ? `Due: ${task.deadline}`
                      : 'No explicit deadline in source'}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{originLabelMap[task.sourceOrigin]}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit task ${task.title}`}
              title="Edit task"
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label={`Delete task ${task.title}`}
              title="Delete task"
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F87171] hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
