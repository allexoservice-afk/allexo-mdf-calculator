<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { formatMmAsMeters } from '../utils/materialStock.js'
import { orderMaterialPricing } from '../utils/materialPricing.js'
import { formatEuroNumber } from '../utils/priceDisplay.js'
import {
  downloadMaterialsCutPdf,
  downloadMaterialsPricePdf,
  generateMaterialsCutPdfBlob,
  generateMaterialsPricePdfBlob,
  preloadMaterialsPdfEngine,
} from '../utils/materialsPdf.js'
import PdfPreviewModal from './PdfPreviewModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {import('vue').PropType<ReturnType<import('../utils/materialStock.js').orderMaterialStock>>} */
  material: { type: Object, default: null },
  /** @type {import('vue').PropType<ReturnType<import('../utils/linearMeters.js').orderLinearMetersTotals>>} */
  linearTotals: { type: Object, default: null },
  windowsCount: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])

const { locale, t } = useLocale()

const pdfLoading = ref(null)
const pdfError = ref('')
const pdfPreviewOpen = ref(false)
const pdfPreviewBlob = ref(null)
const pdfPreviewFilename = ref('')
const pdfPreviewTitle = ref('')

function cutPdfOptions() {
  return {
    locale: locale.value,
    material: props.material,
    linearTotals: props.linearTotals ?? undefined,
    windowsCount: props.windowsCount,
  }
}

function pricePdfOptions() {
  return {
    locale: locale.value,
    pricing: pricing.value,
    windowsCount: props.windowsCount,
  }
}

function openPdfPreview(blob, filename, title) {
  pdfPreviewBlob.value = blob
  pdfPreviewFilename.value = filename
  pdfPreviewTitle.value = title
  pdfPreviewOpen.value = true
}

function closePdfPreview() {
  pdfPreviewOpen.value = false
  pdfPreviewBlob.value = null
  pdfPreviewFilename.value = ''
  pdfPreviewTitle.value = ''
}

function materialName(key) {
  if (key === 'sillEndCap') return t('materials.sillEndCap')
  if (key === 'slopes') return t('summary.dtStockSlopes')
  if (key === 'sill') return t('summary.dtStockSill')
  return t('summary.dtStockTrim')
}

const pricing = computed(() => {
  if (!props.material) return null
  return orderMaterialPricing(props.material, materialName)
})

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

function buildCategory(key, title, pack, showTrimNote = false) {
  const pieces = (pack?.pieces ?? []).map((p) => ({
    lengthMm: p.lengthMm,
    count: p.count,
    meters: formatMmAsMeters(p.lengthMm),
  }))
  return {
    key,
    title,
    bars: pack?.bars ?? 0,
    barsLabel: pack?.bars
      ? t('summary.stockBarsLine').replace('{n}', String(pack.bars))
      : '',
    pieces,
    wasteM: pack?.wasteMm ? formatMmAsMeters(pack.wasteMm) : null,
    showTrimNote,
  }
}

const categories = computed(() => {
  const m = props.material
  if (!m) return []
  const out = []
  if (m.hasSlopes) out.push(buildCategory('slopes', t('summary.dtStockSlopes'), m.slopes))
  if (m.hasSill) out.push(buildCategory('sill', t('summary.dtStockSill'), m.sill))
  if (m.hasTrim) out.push(buildCategory('trim', t('summary.dtStockTrim'), m.trim, true))
  return out
})

async function previewCutPdf() {
  if (pdfLoading.value || !props.material) return
  pdfLoading.value = 'cut-preview'
  pdfError.value = ''
  try {
    const { blob, filename } = await generateMaterialsCutPdfBlob(cutPdfOptions())
    openPdfPreview(blob, filename, t('materials.previewCutPdfTitle'))
  } catch {
    pdfError.value = t('materials.pdfFailed')
  } finally {
    pdfLoading.value = null
  }
}

async function downloadCutPdf() {
  if (pdfLoading.value || !props.material) return
  pdfLoading.value = 'cut'
  pdfError.value = ''
  try {
    await downloadMaterialsCutPdf(cutPdfOptions())
  } catch {
    pdfError.value = t('materials.pdfFailed')
  } finally {
    pdfLoading.value = null
  }
}

async function previewPricePdf() {
  if (pdfLoading.value || !props.material || !pricing.value?.hasRows) return
  pdfLoading.value = 'price-preview'
  pdfError.value = ''
  try {
    const { blob, filename } = await generateMaterialsPricePdfBlob(pricePdfOptions())
    openPdfPreview(blob, filename, t('materials.previewPricePdfTitle'))
  } catch {
    pdfError.value = t('materials.pdfFailed')
  } finally {
    pdfLoading.value = null
  }
}

async function downloadPricePdf() {
  if (pdfLoading.value || !props.material || !pricing.value?.hasRows) return
  pdfLoading.value = 'price'
  pdfError.value = ''
  try {
    await downloadMaterialsPricePdf(pricePdfOptions())
  } catch {
    pdfError.value = t('materials.pdfFailed')
  } finally {
    pdfLoading.value = null
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      pdfError.value = ''
      preloadMaterialsPdfEngine()
    }
  },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && material"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="materials-title"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <div class="modal__head">
          <div>
            <h2 id="materials-title" class="modal__title">{{ t('materials.title') }}</h2>
            <p class="modal__subtitle">{{ t('materials.subtitle') }}</p>
          </div>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </div>

        <p v-if="material.totalBars > 0" class="modal__total">
          {{ t('materials.totalBars').replace('{n}', String(material.totalBars)) }}
        </p>

        <section v-for="cat in categories" :key="cat.key" class="mat-card">
          <header class="mat-card__head">
            <h3 class="mat-card__title">{{ cat.title }}</h3>
            <span v-if="cat.barsLabel" class="mat-card__bars">{{ cat.barsLabel }}</span>
          </header>

          <table v-if="cat.pieces.length" class="cut-table">
            <thead>
              <tr>
                <th class="cut-table__label" colspan="2">{{ t('materials.cutListTitle') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in cat.pieces" :key="i">
                <td class="cut-table__qty">{{ p.count }} {{ t('summary.pcs') }}</td>
                <td class="cut-table__len">{{ p.meters }} {{ t('common.m') }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="cat.wasteM || cat.showTrimNote" class="mat-card__foot">
            <span v-if="cat.wasteM" class="mat-card__waste">
              {{ t('materials.wasteLine').replace('{n}', cat.wasteM) }}
            </span>
            <span v-if="cat.showTrimNote" class="mat-card__note">{{ t('materials.trimNote') }}</span>
          </div>
        </section>

        <p v-if="material.transportWarnCount > 0" class="modal__warn">
          {{ t('summary.materialTransportWarn') }}
        </p>

        <section v-if="pricing?.hasRows" class="price-block">
          <h3 class="price-block__title">{{ t('materials.priceBlockTitle') }}</h3>
          <div class="price-table-wrap">
            <table class="price-table">
              <thead>
                <tr>
                  <th>{{ t('materials.colMaterial') }}</th>
                  <th>{{ t('materials.colQty') }}</th>
                  <th>{{ t('materials.colLength') }}</th>
                  <th>{{ t('materials.colTotalLm') }}</th>
                  <th>{{ t('materials.colPrice') }}</th>
                  <th>{{ t('materials.colPurchase') }}</th>
                  <th>{{ pricing.markupPct }}%</th>
                  <th>{{ t('materials.colTotal') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pricing.rows" :key="row.key">
                  <td>{{ row.name }}</td>
                  <td>{{ row.qty }}</td>
                  <td>{{ row.lengthM }}</td>
                  <td>{{ formatEuroNumber(row.totalLm) }}</td>
                  <td>
                    {{ formatEuroNumber(row.unitPrice) }}
                    {{ row.unitKind === 'lm' ? t('materials.pricePerLm') : t('materials.pricePerPiece') }}
                  </td>
                  <td>{{ formatEuroNumber(row.purchaseEur) }}€</td>
                  <td>{{ formatEuroNumber(row.markupEur) }}€</td>
                  <td class="price-table__total">{{ formatEuroNumber(row.totalEur) }}€</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5">{{ t('materials.grandTotal') }}</td>
                  <td>{{ formatEuroNumber(pricing.purchaseTotal) }}€</td>
                  <td>{{ formatEuroNumber(pricing.markupTotal) }}€</td>
                  <td class="price-table__total">{{ formatEuroNumber(pricing.grandTotal) }}€</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <p v-if="pdfError" class="modal__pdf-error" role="alert">{{ pdfError }}</p>

        <div class="modal__pdf-row">
          <button
            type="button"
            class="modal__pdf modal__pdf--preview"
            :disabled="Boolean(pdfLoading)"
            @click="previewCutPdf"
          >
            <span class="modal__pdf-icon" aria-hidden="true">👁</span>
            {{
              pdfLoading === 'cut-preview' ? t('materials.pdfGenerating') : t('materials.previewCutPdf')
            }}
          </button>
          <button
            type="button"
            class="modal__pdf modal__pdf--cut"
            :disabled="Boolean(pdfLoading)"
            @click="downloadCutPdf"
          >
            <span class="modal__pdf-icon" aria-hidden="true">↓</span>
            {{ pdfLoading === 'cut' ? t('materials.pdfGenerating') : t('materials.downloadCutPdf') }}
          </button>
          <button
            v-if="pricing?.hasRows"
            type="button"
            class="modal__pdf modal__pdf--preview"
            :disabled="Boolean(pdfLoading)"
            @click="previewPricePdf"
          >
            <span class="modal__pdf-icon" aria-hidden="true">👁</span>
            {{
              pdfLoading === 'price-preview'
                ? t('materials.pdfGenerating')
                : t('materials.previewPricePdf')
            }}
          </button>
          <button
            v-if="pricing?.hasRows"
            type="button"
            class="modal__pdf modal__pdf--price"
            :disabled="Boolean(pdfLoading)"
            @click="downloadPricePdf"
          >
            <span class="modal__pdf-icon" aria-hidden="true">↓</span>
            {{ pdfLoading === 'price' ? t('materials.pdfGenerating') : t('materials.downloadPricePdf') }}
          </button>
        </div>

        <button type="button" class="modal__ok" @click="emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </Teleport>

  <PdfPreviewModal
    :open="pdfPreviewOpen"
    :blob="pdfPreviewBlob"
    :filename="pdfPreviewFilename"
    :title="pdfPreviewTitle"
    @close="closePdfPreview"
  />
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: rgba(28, 36, 36, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

@media (min-width: 640px) {
  .backdrop {
    align-items: center;
    padding: 1rem;
  }
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: min(90vh, 640px);
  overflow-y: auto;
  background: var(--allexo-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-md);
  padding: 1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
}

@media (min-width: 640px) {
  .modal {
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.modal__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--allexo-teal);
  line-height: 1.3;
}

.modal__subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--allexo-muted);
}

.modal__close {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: var(--allexo-bg);
  color: var(--allexo-text);
  border-radius: var(--radius);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal__close:hover {
  background: var(--allexo-border);
}

.modal__total {
  margin: 1rem 0 0.85rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border-radius: var(--radius);
}

.mat-card {
  margin-top: 0.75rem;
  padding: 0.85rem 0.9rem;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.mat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.mat-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-text);
}

.mat-card__bars {
  flex-shrink: 0;
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border-radius: 999px;
}

.cut-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.cut-table__label {
  padding: 0 0 0.25rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.cut-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--allexo-border);
}

.cut-table td {
  padding: 0.4rem 0;
}

.cut-table__qty {
  color: var(--allexo-muted);
}

.cut-table__len {
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--allexo-text);
}

.mat-card__foot {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.6rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--allexo-border);
}

.mat-card__waste {
  font-size: 0.8rem;
  color: var(--allexo-muted);
}

.mat-card__note {
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--allexo-muted);
  font-style: italic;
}

.modal__warn {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #b45309;
}

.modal__pdf-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #b91c1c;
}

.modal__pdf-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.price-block {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed var(--allexo-border);
}

.price-block__title {
  margin: 0 0 0.55rem;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.price-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.price-table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.price-table th,
.price-table td {
  padding: 0.5rem 0.5rem;
  text-align: right;
  white-space: nowrap;
}

.price-table thead th {
  border-bottom: 2px solid var(--allexo-border);
}

.price-table th:first-child,
.price-table td:first-child {
  text-align: left;
  white-space: normal;
  font-weight: 600;
}

.price-table th {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.price-table tbody tr:nth-child(even) {
  background: var(--allexo-bg);
}

.price-table tfoot td {
  font-weight: 700;
  border-top: 2px solid var(--allexo-border);
  padding-top: 0.6rem;
}

.price-table__total {
  color: var(--allexo-teal);
  font-weight: 700;
}

.modal__pdf {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex: 1 1 calc(50% - 0.25rem);
  min-width: 0;
  min-height: 2.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
}

.modal__pdf:hover:not(:disabled) {
  filter: brightness(1.05);
}

.modal__pdf:disabled {
  opacity: 0.65;
  cursor: wait;
}

.modal__pdf-icon {
  font-size: 1rem;
  line-height: 1;
}

.modal__pdf--preview {
  color: var(--allexo-teal);
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
}

.modal__pdf--preview:hover:not(:disabled) {
  background: var(--allexo-bg);
  filter: none;
}

.modal__pdf--price {
  background: var(--allexo-bg);
  color: var(--allexo-teal);
  border: 1px solid var(--allexo-teal);
}

.modal__pdf--price:hover:not(:disabled) {
  background: var(--allexo-surface);
  filter: none;
}

.modal__ok {
  width: 100%;
  margin-top: 0.65rem;
  min-height: 2.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-teal);
  border-radius: var(--radius);
  cursor: pointer;
}

.modal__ok:hover {
  background: var(--allexo-surface);
}
</style>
