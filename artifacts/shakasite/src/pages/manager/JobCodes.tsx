import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useListJobCodeCategories,
  useListJobCodes,
  useCreateJobCodeCategory,
  useCreateJobCode,
  useDeleteJobCode,
  useDeleteJobCodeCategory,
  getListJobCodeCategoriesQueryKey,
  getListJobCodesQueryKey,
} from '@workspace/api-client-react';
import type { JobCodeCategory, JobCode } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronUp, Tag, Layers } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function CategoryCard({ cat, allCodes }: { cat: JobCodeCategory; allCodes: JobCode[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const createCode = useCreateJobCode();
  const deleteCode = useDeleteJobCode();
  const deleteCategory = useDeleteJobCodeCategory();

  const codes = allCodes.filter(c => c.categoryId === cat.id);

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    try {
      await createCode.mutateAsync({ data: { categoryId: cat.id, code: newCode.trim().toUpperCase(), name: newName.trim() } });
      queryClient.invalidateQueries({ queryKey: getListJobCodesQueryKey() });
      setNewCode('');
      setNewName('');
    } catch {
      toast({ title: 'Error adding code', variant: 'destructive' });
    }
  };

  const handleDeleteCode = async (id: number) => {
    await deleteCode.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListJobCodesQueryKey() });
  };

  const handleDeleteCategory = async () => {
    if (!confirm(`Delete category "${cat.name}" and all its codes?`)) return;
    await deleteCategory.mutateAsync({ id: cat.id });
    queryClient.invalidateQueries({ queryKey: getListJobCodeCategoriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListJobCodesQueryKey() });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{codes.length} code{codes.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(); }}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {codes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No codes yet — add one below.</p>
                )}
                {codes.map(c => (
                  <div key={c.id} className="flex items-center gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                      <span className="mx-2 text-muted-foreground text-xs">·</span>
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCode(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <form onSubmit={handleAddCode} className="flex gap-2 mt-2">
                  <Input
                    placeholder="CODE"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-28 font-mono text-xs uppercase"
                    maxLength={12}
                  />
                  <Input
                    placeholder="Code description"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newCode.trim() || !newName.trim() || createCode.isPending}
                    className="px-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function JobCodesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [], isLoading } = useListJobCodeCategories();
  const { data: allCodes = [] } = useListJobCodes();
  const createCategory = useCreateJobCodeCategory();

  const [newCatName, setNewCatName] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCatName.trim() } });
      queryClient.invalidateQueries({ queryKey: getListJobCodeCategoriesQueryKey() });
      setNewCatName('');
      toast({ title: 'Category created' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Job Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage high-level code categories and the specific codes within them. These appear when creating jobs.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <form onSubmit={handleCreateCategory} className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>New Category</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Carpentry, Concrete, General"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!newCatName.trim() || createCategory.isPending}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Category
              </Button>
            </div>
          </div>
        </form>
      </motion.div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />)}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">No categories yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a category above to get started — e.g. "Carpentry" or "Concrete".</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-3">
        {categories.map(cat => (
          <CategoryCard key={cat.id} cat={cat} allCodes={allCodes} />
        ))}
      </motion.div>
    </motion.div>
  );
}
