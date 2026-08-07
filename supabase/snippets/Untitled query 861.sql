-- 1. Adicionar colunas de controle no banco local e na nuvem
ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS sincronizado_nuvem BOOLEAN DEFAULT FALSE;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS sincronizado_nuvem BOOLEAN DEFAULT FALSE;

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS sincronizado_local BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS sincronizado_local BOOLEAN DEFAULT FALSE;

-- 2. Índices para acelerar a busca por sincronizações pendentes
CREATE INDEX IF NOT EXISTS idx_produtos_sync ON public.produtos(sincronizado_nuvem) WHERE sincronizado_nuvem = FALSE;
CREATE INDEX IF NOT EXISTS idx_reservas_sync ON public.reservas(sincronizado_local) WHERE sincronizado_local = FALSE;