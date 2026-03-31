import { GripVertical, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { DropdownSelect, type DropdownOption } from '../ui/DropdownSelect'
import { Input } from '../ui/Input'
import { NumberInput } from '../ui/NumberInput'
import {
    DEFAULT_PRICING_MODE,
    DEFAULT_UNIT_CODE,
    normalizePricingMode,
    normalizeUnitCode,
    PRICING_MODE_OPTIONS,
    UNIT_OPTIONS,
} from '../../lib/item-semantics'
import {
    MAX_PRODUCT_IMAGES,
    processProductImageFile,
    PRODUCT_IMAGE_INPUT_ACCEPT,
} from '../../lib/product-media'
import type { PricingMode, ProductMediaDraft, UnitCode } from '../../types'

export interface ProductFormData {
    name: string
    description?: string
    categoryId?: string
    price: number
    unitCode: UnitCode
    customUnitLabel: string
    pricingMode: PricingMode
    mediaDrafts?: ProductMediaDraft[]
}

export interface ProductEditorInitialData {
    name?: string
    description?: string
    categoryId?: string
    price?: number
    unitCode?: UnitCode
    customUnitLabel?: string
    pricingMode?: PricingMode
    mediaDrafts?: ProductMediaDraft[]
}

interface ProductEditorDialogProps {
    open: boolean
    onClose: () => void
    onSave: (data: ProductFormData) => void
    initialData?: ProductEditorInitialData
    title?: string
    saveLabel?: string
    categoryOptions?: DropdownOption[]
    showCategory?: boolean
    showDescription?: boolean
    showMedia?: boolean
    idPrefix?: string
}

const normalizeMediaDrafts = (items: ProductMediaDraft[]): ProductMediaDraft[] => {
    const nextItems = items.slice(0, MAX_PRODUCT_IMAGES)
    const coverIndex = Math.max(
        0,
        nextItems.findIndex((item) => item.isCover),
    )

    return nextItems.map((item, index) => ({
        ...item,
        sortOrder: index,
        isCover: index === coverIndex,
    }))
}

interface ProductMediaCardProps {
    media: ProductMediaDraft
    index: number
    total: number
    onSetCover: (index: number) => void
    onRemove: (index: number) => void
}

function ProductMediaCard({ media, index, total, onSetCover, onRemove }: ProductMediaCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: media.thumbnailDataUrl })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative rounded-xl border border-stone-200 p-2 transition-opacity bg-white',
                isDragging ? 'opacity-70 shadow-xl scale-105' : 'opacity-100 hover:border-zinc-300'
            )}
        >
            <div className="relative overflow-hidden rounded-lg">
                <img
                    src={media.thumbnailDataUrl}
                    alt={media.fileName}
                    className="h-28 w-full object-cover transition-transform duration-300 hover:scale-110"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onSetCover(index)}
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white',
                            media.isCover ? 'text-yellow-500' : 'text-zinc-500 hover:text-zinc-800'
                        )}
                        aria-label="Set cover image"
                        title="Set as cover"
                    >
                        <Star className={cn('h-3.5 w-3.5', media.isCover && 'fill-current')} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove image"
                        title="Remove image"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <p className="mt-2 truncate text-[11px] font-medium text-zinc-600 px-1">{media.fileName}</p>

            <button
                type="button"
                {...attributes}
                {...listeners}
                disabled={total <= 1}
                className={cn(
                    'mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-zinc-600 transition-colors',
                    total > 1 ? 'cursor-grab hover:bg-stone-100 hover:text-zinc-900 active:cursor-grabbing' : 'select-none opacity-50'
                )}
                aria-label="Drag image to reorder"
                title="Drag to reorder"
            >
                <GripVertical className="h-3.5 w-3.5" />
                Drag
            </button>
        </div>
    )
}

export function ProductEditorDialog({
    open,
    onClose,
    onSave,
    initialData,
    title = 'Add New Product',
    saveLabel = 'Save Product',
    categoryOptions = [],
    showCategory = true,
    showDescription = false,
    showMedia = false,
    idPrefix = 'prod-editor',
}: ProductEditorDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [price, setPrice] = useState(0)
    const [unitCode, setUnitCode] = useState<UnitCode>(DEFAULT_UNIT_CODE)
    const [customUnitLabel, setCustomUnitLabel] = useState('')
    const [pricingMode, setPricingMode] = useState<PricingMode>(DEFAULT_PRICING_MODE)
    const [mediaDrafts, setMediaDrafts] = useState<ProductMediaDraft[]>([])
    const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null)
    const [isProcessingMedia, setIsProcessingMedia] = useState(false)

    useEffect(() => {
        if (open) {
            setName(initialData?.name ?? '')
            setDescription(initialData?.description ?? '')
            setCategoryId(initialData?.categoryId ?? '')
            setPrice(initialData?.price ?? 0)
            setUnitCode(normalizeUnitCode(initialData?.unitCode ?? DEFAULT_UNIT_CODE))
            setCustomUnitLabel(initialData?.customUnitLabel ?? '')
            setPricingMode(normalizePricingMode(initialData?.pricingMode ?? DEFAULT_PRICING_MODE))
            setMediaDrafts(normalizeMediaDrafts(initialData?.mediaDrafts ?? []))
            setMediaErrorMessage(null)
            setIsProcessingMedia(false)
        }
    }, [initialData, open])

    const nameInputId = `${idPrefix}-name`
    const descriptionInputId = `${idPrefix}-description`
    const imageInputId = `${idPrefix}-image`

    const handleSave = () => {
        onSave({
            name,
            description: showDescription ? description.trim() : undefined,
            categoryId: showCategory ? categoryId : undefined,
            price,
            unitCode,
            customUnitLabel,
            pricingMode,
            mediaDrafts: showMedia ? mediaDrafts : undefined,
        })
    }

    const unitOptions = useMemo<DropdownOption[]>(() => UNIT_OPTIONS, [])
    const pricingModeOptions = useMemo<DropdownOption[]>(() => PRICING_MODE_OPTIONS, [])

    const handleAddMediaFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        if (!showMedia) {
            return
        }

        const selectedFiles = Array.from(event.target.files ?? [])
        event.target.value = ''

        if (selectedFiles.length === 0) {
            return
        }

        const remainingSlots = MAX_PRODUCT_IMAGES - mediaDrafts.length
        if (remainingSlots <= 0) {
            setMediaErrorMessage(`A product can only keep up to ${MAX_PRODUCT_IMAGES} images.`)
            return
        }

        const filesToProcess = selectedFiles.slice(0, remainingSlots)
        const droppedCount = selectedFiles.length - filesToProcess.length

        setIsProcessingMedia(true)
        setMediaErrorMessage(null)

        try {
            const processedDrafts: ProductMediaDraft[] = []

            for (const file of filesToProcess) {
                try {
                    const processedImage = await processProductImageFile(file)
                    processedDrafts.push({
                        ...processedImage,
                        sortOrder: 0,
                        isCover: false,
                    })
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to process one of the selected images.'
                    setMediaErrorMessage(message)
                }
            }

            if (processedDrafts.length > 0) {
                setMediaDrafts((previous) => normalizeMediaDrafts([...previous, ...processedDrafts]))
            }

            if (droppedCount > 0) {
                setMediaErrorMessage(`Only ${MAX_PRODUCT_IMAGES} images are allowed per product.`)
            }
        } finally {
            setIsProcessingMedia(false)
        }
    }

    const removeMedia = (index: number) => {
        setMediaDrafts((previous) => normalizeMediaDrafts(previous.filter((_, itemIndex) => itemIndex !== index)))
    }

    const setCoverImage = (index: number) => {
        setMediaDrafts((previous) =>
            normalizeMediaDrafts(previous.map((entry, itemIndex) => ({ ...entry, isCover: itemIndex === index }))),
        )
    }

    const reorderMedia = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) {
            return
        }

        setMediaDrafts((previous) => {
            if (
                fromIndex < 0
                || toIndex < 0
                || fromIndex >= previous.length
                || toIndex >= previous.length
            ) {
                return previous
            }

            const next = [...previous]
            const [movingItem] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, movingItem)

            return normalizeMediaDrafts(next)
        })
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = mediaDrafts.findIndex((m) => m.thumbnailDataUrl === active.id)
            const newIndex = mediaDrafts.findIndex((m) => m.thumbnailDataUrl === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderMedia(oldIndex, newIndex)
            }
        }
    }

    const formFields = (
        <>
            <div>
                <label htmlFor={nameInputId} className="mb-1 block text-xs font-semibold text-zinc-600">
                    Product Name
                </label>
                <Input
                    id={nameInputId}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Coffee Beans"
                />
            </div>

            {showDescription && (
                <div>
                    <label htmlFor={descriptionInputId} className="mb-1 block text-xs font-semibold text-zinc-600">
                        Description (optional)
                    </label>
                    <textarea
                        id={descriptionInputId}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Product detail or internal note"
                        className="h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Price</label>
                    <NumberInput min={0} value={price} onValueChange={setPrice} />
                </div>
                {showCategory && (
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-600">Category</label>
                        <DropdownSelect value={categoryId} onChange={setCategoryId} options={categoryOptions} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Unit</label>
                    <DropdownSelect
                        value={unitCode}
                        onChange={(nextValue) => {
                            const nextUnitCode = normalizeUnitCode(nextValue)
                            setUnitCode(nextUnitCode)
                            if (nextUnitCode !== 'custom') {
                                setCustomUnitLabel('')
                            }
                        }}
                        options={unitOptions}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Pricing Mode</label>
                    <DropdownSelect
                        value={pricingMode}
                        onChange={(nextValue) => setPricingMode(normalizePricingMode(nextValue))}
                        options={pricingModeOptions}
                    />
                </div>
            </div>

            {unitCode === 'custom' && (
                <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Custom Unit Label</label>
                    <Input
                        value={customUnitLabel}
                        onChange={(event) => setCustomUnitLabel(event.target.value)}
                        placeholder="e.g. pack, tray"
                    />
                </div>
            )}
        </>
    )

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            panelClassName="md:max-w-4xl"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={name.trim().length === 0 || isProcessingMedia}>
                        {saveLabel}
                    </Button>
                </>
            }
        >
            <div className="pt-2">
                {showMedia ? (
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
                        <div className="grid gap-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <label className="block text-xs font-semibold text-zinc-600">Product Images</label>
                                <p className="text-xs text-zinc-500">
                                    {mediaDrafts.length}/{MAX_PRODUCT_IMAGES}
                                </p>
                            </div>

                            <label
                                htmlFor={imageInputId}
                                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-100"
                            >
                                <ImagePlus className="h-5 w-5 text-zinc-600" />
                                <span className="mt-1 text-sm font-semibold text-zinc-700">
                                    {isProcessingMedia ? 'Processing images...' : 'Click to upload product images'}
                                </span>
                                <span className="mt-1 text-xs text-zinc-500">Auto-compress + thumbnail, max 2MB each</span>
                            </label>

                            <input
                                id={imageInputId}
                                type="file"
                                accept={PRODUCT_IMAGE_INPUT_ACCEPT}
                                multiple
                                onChange={(event) => {
                                    void handleAddMediaFiles(event)
                                }}
                                className="sr-only"
                            />

                            {mediaErrorMessage && <p className="text-xs font-semibold text-red-600">{mediaErrorMessage}</p>}

                            {mediaDrafts.length > 0 && (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={mediaDrafts.map((m) => m.thumbnailDataUrl)}
                                        strategy={rectSortingStrategy}
                                    >
                                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                                            {mediaDrafts.map((media, index) => (
                                                <ProductMediaCard
                                                    key={media.thumbnailDataUrl}
                                                    media={media}
                                                    index={index}
                                                    total={mediaDrafts.length}
                                                    onSetCover={setCoverImage}
                                                    onRemove={removeMedia}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>

                        <div className="grid gap-3">{formFields}</div>
                    </div>
                ) : (
                    <div className="grid gap-3">{formFields}</div>
                )}
            </div>
        </Dialog>
    )
}
