"use client";

import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import LeadCard from '@/components/LeadCard';
import LeadDetailDrawer from '@/components/LeadDetailDrawer';
import EditLeadDialog from '@/components/EditLeadDialog';
import { useLeadsInfiniteByStatus, usePipelineStages, useSavePipelineStages, useUpdateLead, type PipelineStageConfig } from '@/hooks/useCrmData';
import { PIPELINE_STAGES, type PipelineStage } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext, DragOverlay, pointerWithin, rectIntersection,
  PointerSensor, TouchSensor,
  useSensor, useSensors, type DragStartEvent, type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import type { LeadWithRelations } from '@/hooks/useCrmData';
import { motion } from 'framer-motion';
import { MoreVertical, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PIPELINE_STAGE_PAGE_SIZE = 50;

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] flex-1 space-y-2 rounded-lg transition-colors duration-150 ${
        isOver ? 'bg-accent/10 ring-2 ring-accent/30' : ''
      }`}
    >
      {children}
    </div>
  );
}

function DraggableCard({ lead, onClick, onEdit }: { lead: LeadWithRelations; onClick: () => void; onEdit: (lead: LeadWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ willChange: isDragging ? 'transform' : 'auto' }}
      className={`cursor-grab active:cursor-grabbing touch-none select-none transition-opacity duration-150 ${isDragging ? 'opacity-20 scale-[0.98]' : ''}`}
      onDoubleClick={onClick}
    >
      <LeadCard lead={{
        id: lead.id, name: lead.name, phone: lead.phone,
        source: lead.source as any, status: lead.status as any,
        assignedAgent: lead.members?.name || 'Unassigned',
        zone: (lead as any).zone ?? undefined,
        createdAt: lead.createdAt, lastActivity: lead.lastActivityAt,
        firstResponseTime: lead.firstResponseTimeMin ?? undefined,
        budget: lead.budget ?? undefined, preferredLocation: lead.preferredLocation ?? undefined,
        property: lead.properties?.name ?? undefined,
      }} stale={new Date(lead.lastActivityAt).getTime() < Date.now() - 7 * 86400000}
        extraActions={
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-lg hover:bg-secondary transition-colors" title="More options">
                  <MoreVertical size={11} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(lead)}>
                  Edit Lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
    </div>
  );
}

function PipelineStageColumn({
  stage,
  onOpenDetail,
  onEdit,
}: {
  stage: PipelineStageConfig;
  onOpenDetail: (lead: LeadWithRelations) => void;
  onEdit: (lead: LeadWithRelations) => void;
}) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useLeadsInfiniteByStatus(stage.key, PIPELINE_STAGE_PAGE_SIZE);

  const stageLeads = useMemo(
    () => (data?.pages || []).flatMap((page) => page.leads),
    [data]
  );
  const totalLeads = data?.pages?.[0]?.total ?? stageLeads.length;
  const visibleCount = stageLeads.length;

  return (
    <div className="flex items-start">
      <motion.div
        className="pipeline-column bg-secondary/30 w-[272px] flex flex-col"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-[11px] text-foreground">{stage.label}</h3>
          </div>
          <span className="text-[10px] font-medium bg-card px-1.5 py-0.5 rounded-md text-muted-foreground border border-border">
            {totalLeads}
          </span>
        </div>

        <DroppableColumn id={stage.key}>
          {isLoading && stageLeads.length === 0 ? (
            <div className="space-y-2">
              {[...Array(PIPELINE_STAGE_PAGE_SIZE)].map((_, index) => (
                <Skeleton key={index} className="h-[92px] rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {stageLeads.map((lead) => (
                <DraggableCard key={lead.id} lead={lead} onClick={() => onOpenDetail(lead)} onEdit={onEdit} />
              ))}
              {visibleCount === 0 && (
                <div className="text-center py-8 text-[11px] text-muted-foreground">No leads</div>
              )}
            </>
          )}
        </DroppableColumn>

        {hasNextPage && (
          <div className="px-1 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-[11px]"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : `Load more (${visibleCount}/${totalLeads})`}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function slugifyStageKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function EditStagesDialog({
  open,
  onOpenChange,
  stages,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStageConfig[];
  onSave: (stages: PipelineStageConfig[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [draftStages, setDraftStages] = useState<PipelineStageConfig[]>([]);
  const [newStageLabel, setNewStageLabel] = useState('');

  const resetFromProps = () => {
    setDraftStages(stages.map((s, index) => ({ ...s, order: index })));
    setNewStageLabel('');
  };

  useEffect(() => {
    if (open) {
      resetFromProps();
    }
  }, [open, stages]);

  const reorderStage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= draftStages.length || toIndex >= draftStages.length) return;
    const copy = [...draftStages];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    setDraftStages(copy.map((s, i) => ({ ...s, order: i })));
  };

  const removeStage = (index: number) => {
    if (draftStages.length <= 1) {
      toast.error('At least one stage is required');
      return;
    }
    const copy = draftStages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setDraftStages(copy);
  };

  const addStage = () => {
    const label = newStageLabel.trim();
    if (!label) return;

    let baseKey = slugifyStageKey(label);
    if (!baseKey) {
      toast.error('Please enter a valid stage name');
      return;
    }
    let key = baseKey;
    let n = 2;
    const keySet = new Set(draftStages.map((s) => s.key));
    while (keySet.has(key)) {
      key = `${baseKey}_${n}`;
      n += 1;
    }

    setDraftStages([
      ...draftStages,
      {
        key,
        label,
        color: 'bg-secondary',
        order: draftStages.length,
      },
    ]);
    setNewStageLabel('');
  };

  const save = async () => {
    const cleaned = draftStages
      .map((s, index) => ({
        ...s,
        label: String(s.label || '').trim(),
        key: String(s.key || '').trim(),
        color: String(s.color || 'bg-secondary').trim(),
        order: index,
      }))
      .filter((s) => s.key && s.label);

    if (cleaned.length === 0) {
      toast.error('At least one stage is required');
      return;
    }
    if (new Set(cleaned.map((s) => s.key)).size !== cleaned.length) {
      toast.error('Stage keys must be unique');
      return;
    }

    await onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) resetFromProps();
      }}
    >
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Edit Pipeline Stages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={newStageLabel}
              onChange={(e) => setNewStageLabel(e.target.value)}
              placeholder="Add new stage name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStage();
                }
              }}
            />
            <Button type="button" variant="outline" className="gap-1.5" onClick={addStage}>
              <Plus size={14} /> Add Stage
            </Button>
          </div>

          <div className="max-h-[52vh] overflow-y-auto border rounded-md">
            <div className="p-2 space-y-2">
              {draftStages.length === 0 && (
                <div className="text-sm text-muted-foreground p-3 text-center">
                  No stages loaded yet. Add a stage to begin.
                </div>
              )}
              {draftStages.map((stage, index) => (
                <div
                  key={stage.key}
                  className="grid grid-cols-12 gap-2 items-center border rounded-md p-2"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(index));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    if (!Number.isNaN(from)) reorderStage(from, index);
                  }}
                >
                  <div className="col-span-1 flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
                    <GripVertical size={14} />
                  </div>

                  <div className="col-span-10">
                    <Input
                      value={stage.label}
                      onChange={(e) => {
                        const copy = [...draftStages];
                        copy[index] = { ...copy[index], label: e.target.value };
                        setDraftStages(copy);
                      }}
                      placeholder="Stage label"
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStage(index)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Deleting a stage will automatically move its leads to the first stage.</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Stages'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Pipeline = () => {
  const { user } = useAuth();
  const { data: pipelineStagesData, isLoading } = usePipelineStages();
  const savePipelineStages = useSavePipelineStages();
  const updateLead = useUpdateLead();
  const [activeLead, setActiveLead] = useState<LeadWithRelations | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<LeadWithRelations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStagesOpen, setEditStagesOpen] = useState(false);
  const pipelineStages: PipelineStageConfig[] =
    (pipelineStagesData && pipelineStagesData.length > 0)
      ? pipelineStagesData
      : PIPELINE_STAGES.map((stage, index) => ({ ...stage, order: index }));
  const canEditStages = user?.role === 'super_admin';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // Custom collision detection: only consider droppable columns (stage keys), never other draggable cards
  const stageKeys = useMemo(() => new Set(pipelineStages.map(s => s.key)), [pipelineStages]);
  const columnOnlyCollision: CollisionDetection = (args) => {
    // First try pointerWithin — the most intuitive algorithm
    const pointerCollisions = pointerWithin(args);
    const columnHits = pointerCollisions.filter(c => stageKeys.has(String(c.id)));
    if (columnHits.length > 0) return columnHits;

    // Fallback to rectIntersection for edge cases (fast drags)
    const rectCollisions = rectIntersection(args);
    const rectColumnHits = rectCollisions.filter(c => stageKeys.has(String(c.id)));
    if (rectColumnHits.length > 0) return rectColumnHits;

    return [];
  };
  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead((event.active.data.current?.lead as LeadWithRelations | undefined) || null);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as string;
    const newStatus = over.id as PipelineStage;
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus });
      toast.success(`Moved to ${pipelineStages.find(s => s.key === newStatus)?.label || newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  };

  const openDetail = (lead: LeadWithRelations) => { setSelectedLead(lead); setDrawerOpen(true); };
  const openEdit = (lead: LeadWithRelations) => { setSelectedLeadForEdit(lead); setEditDialogOpen(true); };
  const handleSaveStages = async (stages: PipelineStageConfig[]) => {
    await savePipelineStages.mutateAsync(stages);
  };

  if (isLoading) {
    return (
      <AppLayout title="Pipeline" subtitle="Revenue engine — track leads through every stage">
        <div className="flex gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[400px] w-[272px] rounded-xl" />)}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Pipeline"
      subtitle="Revenue engine — track leads through every stage"
      actions={
        <div className="flex items-center gap-2">
          {canEditStages && (
            <Button variant="outline" size="sm" onClick={() => setEditStagesOpen(true)}>
              Edit Stages
            </Button>
          )}
        </div>
      }
    >
      <DndContext sensors={sensors} collisionDetection={columnOnlyCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {pipelineStages.map((stage) => (
              <PipelineStageColumn
                key={stage.key}
                stage={stage}
                onOpenDetail={openDetail}
                onEdit={openEdit}
              />
            ))}
          </div>
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeLead ? (
            <div className="rotate-1 opacity-95 shadow-xl rounded-xl" style={{ willChange: 'transform', pointerEvents: 'none' }}>
              <LeadCard lead={{
                id: activeLead.id, name: activeLead.name, phone: activeLead.phone,
                source: activeLead.source as any, status: activeLead.status as any,
                assignedAgent: activeLead.members?.name || 'Unassigned',
                zone: (activeLead as any).zone ?? undefined,
                createdAt: activeLead.createdAt, lastActivity: activeLead.lastActivityAt,
                firstResponseTime: activeLead.firstResponseTimeMin ?? undefined,
                budget: activeLead.budget ?? undefined, preferredLocation: activeLead.preferredLocation ?? undefined,
                property: activeLead.properties?.name ?? undefined,
              }} compact stale={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadDetailDrawer lead={selectedLead} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <EditLeadDialog
        lead={selectedLeadForEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      {canEditStages && (
        <EditStagesDialog
          open={editStagesOpen}
          onOpenChange={setEditStagesOpen}
          stages={pipelineStages}
          onSave={handleSaveStages}
          isSaving={savePipelineStages.isPending}
        />
      )}
    </AppLayout>
  );
};

export default Pipeline;
