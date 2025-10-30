import { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';

interface WordItem {
  id: string;
  content: string;
}

export const useDragDrop = () => {
  const [selectedWords, setSelectedWords] = useState<WordItem[]>([]);
  const [poolWords, setPoolWords] = useState<WordItem[]>([]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (over.id === 'submission-area') {
      const draggedWord = poolWords.find(w => w.id === active.id);
      if (draggedWord) {
        setSelectedWords(prev => [...prev, draggedWord]);
        setPoolWords(prev => prev.filter(w => w.id !== active.id));
      }
    } else if (over.id === 'word-pool') {
      const draggedWord = selectedWords.find(w => w.id === active.id);
      if (draggedWord) {
        setPoolWords(prev => [...prev, draggedWord]);
        setSelectedWords(prev => prev.filter(w => w.id !== active.id));
      }
    }
  }, [poolWords, selectedWords]);

  const reorderSelected = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(selectedWords);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSelectedWords(result);
  }, [selectedWords]);

  const setWords = useCallback((words: string[]) => {
    const wordItems = words.map(word => ({
      id: `${word}-${Math.random().toString(36).slice(2)}`,
      content: word
    }));
    setPoolWords(wordItems);
    setSelectedWords([]);
  }, []);

  return {
    poolWords,
    selectedWords,
    handleDragEnd,
    reorderSelected,
    setWords,
    getSubmissionWords: () => selectedWords.map(w => w.id),
  };
};