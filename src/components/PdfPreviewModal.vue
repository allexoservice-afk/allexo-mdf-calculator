<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import {
  canSharePdfFile,
  downloadPdfBlob,
  pdfFileFromBlob,
  shareProposalPdfBlob,
} from '../utils/shareProposalPdf.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  blob: { type: Blob, default: null },
  filename: { type: String, default: '' },
  title: { type: String, default: '' },
  allowShare: { type: Boolean, default: false },
  shareText: { type: String, default: '' },
  shareTitle: { type: String, default: 'ALLEXO' },
})

const emit = defineEmits(['close'])

const { t } = useLocale()
const objectUrl = ref('')
const feedback = ref('')
const feedbackIsError = ref(false)

const canShare = computed(() => {
  if (!props.allowShare || !props.blob || !props.filename) return false
  try {
    return canSharePdfFile(pdfFileFromBlob(props.blob, props.filename))
  } catch {
    return false
  }
})

function revokeUrl() {
  if (!objectUrl.value) return
  URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

watch(
  () => [props.open, props.blob],
  () => {
    revokeUrl()
    feedback.value = ''
    feedbackIsError.value = false
    if (props.open && props.blob) {
      objectUrl.value = URL.createObjectURL(props.blob)
    }
  },
  { immediate: true },
)

onBeforeUnmount(revokeUrl)

function showFeedback(msg, isError = false) {
  feedback.value = msg
  feedbackIsError.value = isError
  window.setTimeout(() => {
    feedback.value = ''
    feedbackIsError.value = false
  }, 3000)
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

function download() {
  if (props.blob && props.filename) {
    downloadPdfBlob(props.blob, props.filename)
    showFeedback(t('pdfPreview.downloaded'))
  }
}

async function share() {
  if (!props.blob || !props.filename) return
  try {
    const result = await shareProposalPdfBlob(props.blob, props.filename, {
      title: props.shareTitle,
      text: props.shareText,
    })
    if (result.ok && !result.cancelled) {
      showFeedback(t('pdfPreview.shareReady'))
    } else if (result.reason === 'unsupported') {
      downloadPdfBlob(props.blob, props.filename)
      showFeedback(t('pdfPreview.savedAttach'))
    }
  } catch (e) {
    console.error(e)
    showFeedback(t('summary.pdfFailed'), true)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && objectUrl"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="title || t('pdfPreview.title')"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <header class="modal__head">
          <h2 class="modal__title">{{ title || t('pdfPreview.title') }}</h2>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </header>

        <div class="modal__frame-wrap">
          <iframe class="modal__frame" :src="objectUrl" :title="title || t('pdfPreview.title')" />
        </div>

        <p
          v-if="feedback"
          class="modal__feedback"
          :class="{ 'modal__feedback--error': feedbackIsError }"
          role="status"
        >
          {{ feedback }}
        </p>

        <div class="modal__actions">
          <button type="button" class="modal__btn modal__btn--secondary" @click="emit('close')">
            {{ t('common.close') }}
          </button>
          <button
            v-if="canShare"
            type="button"
            class="modal__btn modal__btn--share"
            @click="share"
          >
            <span aria-hidden="true">↗</span>
            {{ t('pdfPreview.share') }}
          </button>
          <button type="button" class="modal__btn modal__btn--primary" @click="download">
            <span aria-hidden="true">↓</span>
            {{ t('pdfPreview.download') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(28, 36, 36, 0.55);
  display: flex;
  align-items: stretch;
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
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 920px;
  height: 100%;
  max-height: 100vh;
  background: var(--allexo-surface);
  box-shadow: var(--shadow-md);
}

@media (min-width: 640px) {
  .modal {
    height: min(92vh, 860px);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--allexo-border);
}

.modal__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.modal__close {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: var(--allexo-bg);
  color: var(--allexo-text);
  border-radius: var(--radius);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.modal__close:hover {
  background: var(--allexo-border);
}

.modal__frame-wrap {
  flex: 1;
  min-height: 0;
  background: #525659;
}

.modal__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.modal__feedback {
  margin: 0;
  padding: 0.5rem 1rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-teal);
  text-align: center;
}

.modal__feedback--error {
  color: var(--allexo-danger);
}

.modal__actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--allexo-border);
}

.modal__btn {
  flex: 1;
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: var(--radius);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.modal__btn--secondary {
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
}

.modal__btn--share {
  color: #fff;
  background: #111111;
  border: 1px solid #111111;
}

.modal__btn--primary {
  color: #fff;
  background: var(--allexo-teal);
  border: 1px solid var(--allexo-teal);
}
</style>
