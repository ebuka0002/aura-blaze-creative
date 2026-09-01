import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import {
  fetchTaxonomyAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createCollection,
  uploadCollectionImage,
  updateCollection,
  deleteCollection,
} from '../../lib/taxonomy'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function AdminCategories() {
  const [taxonomy, setTaxonomy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryForm, setCategoryForm] = useState(null)
  const [collectionForm, setCollectionForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [collectionFile, setCollectionFile] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchTaxonomyAdmin()
      setTaxonomy(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load taxonomy:', err)
      setError(
        'Could not load categories. Run the categories/collections SQL migration first, then refresh.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // =========================
  // CATEGORY
  // =========================

  const saveCategory = async (e) => {
    e.preventDefault()

    setSaving(true)
    setError('')

    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug:
          categoryForm.slug.trim() ||
          slugify(categoryForm.name),
        tagline: (categoryForm.tagline || '').trim(),
        sort_order:
          Number(categoryForm.sort_order) || 0,
      }

      if (categoryForm.id) {
        await updateCategory(
          categoryForm.id,
          payload
        )
      } else {
        await createCategory(payload)
      }

      setCategoryForm(null)

      await load()
    } catch (err) {
      console.error(
        'Failed to save category:',
        err
      )

      setError(
        err.message ||
          'Could not save category.'
      )
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (category) => {
    const confirmed = window.confirm(
      `Delete the category "${category.name}"? Products will remain, but their category/collection assignment will be cleared.`
    )

    if (!confirmed) return

    try {
      await deleteCategory(category.id)
      await load()
    } catch (err) {
      console.error(
        'Failed to delete category:',
        err
      )

      setError(
        err.message ||
          'Could not delete category.'
      )
    }
  }

  // =========================
  // COLLECTION
  // =========================

  const saveCollection = async (e) => {
    e.preventDefault()

    setSaving(true)
    setError('')

    try {
      const slug =
        collectionForm.slug.trim() ||
        slugify(collectionForm.name)

      // A photo is required when creating
      // a brand-new collection.
      if (
        !collectionForm.id &&
        !collectionFile
      ) {
        setError(
          'A collection photo is required when creating a collection.'
        )

        setSaving(false)
        return
      }

      // Keep the existing image if editing
      // and no new image was selected.
      let imageUrl =
        collectionForm.image_url || ''

      // Upload the newly selected image.
      if (collectionFile) {
        imageUrl =
          await uploadCollectionImage(
            slug,
            collectionFile
          )
      }

      const payload = {
        name: collectionForm.name.trim(),
        slug,
        sort_order:
          Number(collectionForm.sort_order) || 0,
        image_url: imageUrl,
      }

      if (collectionForm.id) {
        await updateCollection(
          collectionForm.id,
          payload
        )
      } else {
        await createCollection({
          categoryId:
            collectionForm.categoryId,
          ...payload,
        })
      }

      setCollectionForm(null)
      setCollectionFile(null)

      await load()
    } catch (err) {
      console.error(
        'Failed to save collection:',
        err
      )

      setError(
        err.message ||
          'Could not save collection.'
      )
    } finally {
      setSaving(false)
    }
  }

  const removeCollection = async (collection) => {
    const confirmed = window.confirm(
      `Delete the collection "${collection.name}"? Products in it will remain but lose their collection assignment.`
    )

    if (!confirmed) return

    try {
      await deleteCollection(collection.id)
      await load()
    } catch (err) {
      console.error(
        'Failed to delete collection:',
        err
      )

      setError(
        err.message ||
          'Could not delete collection.'
      )
    }
  }

  // =========================
  // OPEN FORMS
  // =========================

  const openNewCategory = () => {
    setError('')

    setCategoryForm({
      id: '',
      name: '',
      slug: '',
      tagline: '',
      sort_order:
        taxonomy.length + 1,
    })
  }

  const openEditCategory = (category) => {
    setError('')

    setCategoryForm({
      ...category,
      tagline: category.tagline || '',
    })
  }

  const openNewCollection = (category) => {
    setError('')
    setCollectionFile(null)

    setCollectionForm({
      id: '',
      categoryId: category.id,
      name: '',
      slug: '',
      sort_order:
        (category.collections?.length || 0) +
        1,
      image_url: '',
    })
  }

  const openEditCollection = (
    category,
    collection
  ) => {
    setError('')
    setCollectionFile(null)

    setCollectionForm({
      ...collection,
      categoryId: category.id,
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-[1100px]">
      {/* =========================
          HEADER
      ========================== */}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide">
            Categories & Collections
          </h1>

          <p className="text-grey text-sm mt-1">
            Create and organize the categories
            and collections your customers shop.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCategory}
          className="flex items-center gap-2 bg-void text-bone px-5 py-2.5 text-sm font-medium hover:bg-blaze"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* =========================
          ERROR
      ========================== */}

      {error && (
        <div className="mb-6 border border-blaze/30 bg-blaze/5 p-4 text-sm text-blaze">
          {error}
        </div>
      )}

      {/* =========================
          TAXONOMY
      ========================== */}

      {loading ? (
        <p className="text-grey text-sm">
          Loading…
        </p>
      ) : (
        <div className="space-y-5">
          {taxonomy.map((category) => (
            <div
              key={category.id}
              className="bg-white border border-hairline p-5 md:p-6"
            >
              {/* CATEGORY HEADER */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl tracking-wide">
                    {category.name}
                  </h2>

                  <p className="text-xs text-grey mt-1">
                    /{category.slug} ·{' '}
                    {category.collections?.length ||
                      0}{' '}
                    collection
                    {(category.collections
                      ?.length || 0) === 1
                      ? ''
                      : 's'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* NEW COLLECTION */}

                  <button
                    type="button"
                    onClick={() =>
                      openNewCollection(
                        category
                      )
                    }
                    className="text-xs text-blaze hover:underline"
                  >
                    <Plus
                      size={13}
                      className="inline mr-1"
                    />
                    Collection
                  </button>

                  {/* EDIT CATEGORY */}

                  <button
                    type="button"
                    onClick={() =>
                      openEditCategory(
                        category
                      )
                    }
                    className="text-xs text-grey hover:text-void"
                  >
                    Edit
                  </button>

                  {/* DELETE CATEGORY */}

                  <button
                    type="button"
                    onClick={() =>
                      removeCategory(
                        category
                      )
                    }
                    className="text-xs text-grey hover:text-blaze"
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* =========================
                  COLLECTION LIST
              ========================== */}

              {category.collections?.length >
                0 && (
                <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.collections.map(
                    (collection) => (
                      <div
                        key={collection.id}
                        className="border border-hairline/70 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          {/* COLLECTION IMAGE */}

                          {collection.image_url && (
                            <img
                              src={
                                collection.image_url
                              }
                              alt={
                                collection.name
                              }
                              className="w-14 h-16 object-cover mb-2"
                            />
                          )}

                          <p className="text-sm">
                            {collection.name}
                          </p>

                          <p className="text-[11px] text-grey mt-0.5 break-all">
                            /
                            {
                              category.slug
                            }
                            /
                            {
                              collection.slug
                            }
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* EDIT COLLECTION */}

                          <button
                            type="button"
                            onClick={() =>
                              openEditCollection(
                                category,
                                collection
                              )
                            }
                            className="text-[11px] text-grey hover:text-void"
                          >
                            Edit
                          </button>

                          {/* DELETE COLLECTION */}

                          <button
                            type="button"
                            onClick={() =>
                              removeCollection(
                                collection
                              )
                            }
                            className="text-grey hover:text-blaze"
                            aria-label={`Delete ${collection.name}`}
                          >
                            <Trash2
                              size={13}
                            />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =========================
          CATEGORY MODAL
      ========================== */}

      {categoryForm && (
        <Modal
          title={
            categoryForm.id
              ? 'Edit Category'
              : 'New Category'
          }
          onClose={() =>
            setCategoryForm(null)
          }
        >
          <form
            onSubmit={saveCategory}
            className="space-y-4"
          >
            <Field label="Name">
              <input
                required
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    name: e.target.value,
                  })
                }
                className="field"
                placeholder="e.g. T-Shirts"
              />
            </Field>

            <Field label="URL slug">
              <input
                required
                value={categoryForm.slug}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    slug: e.target.value,
                  })
                }
                className="field"
                placeholder="e.g. tshirts"
              />
            </Field>

            <Field label="Tagline">
              <input
                value={
                  categoryForm.tagline || ''
                }
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    tagline: e.target.value,
                  })
                }
                className="field"
                placeholder="Optional short description"
              />
            </Field>

            <Field label="Sort order">
              <input
                type="number"
                value={
                  categoryForm.sort_order ?? 0
                }
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    sort_order:
                      e.target.value,
                  })
                }
                className="field"
              />
            </Field>

            <Submit saving={saving} />
          </form>
        </Modal>
      )}

      {/* =========================
          COLLECTION MODAL
      ========================== */}

      {collectionForm && (
        <Modal
          title={
            collectionForm.id
              ? 'Edit Collection'
              : 'New Collection'
          }
          onClose={() => {
            setCollectionForm(null)
            setCollectionFile(null)
          }}
        >
          <form
            onSubmit={saveCollection}
            className="space-y-4"
          >
            {/* CATEGORY */}

            <Field label="Category">
              <select
                disabled={Boolean(
                  collectionForm.id
                )}
                value={
                  collectionForm.categoryId
                }
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    categoryId:
                      e.target.value,
                  })
                }
                className="field"
              >
                {taxonomy.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* NAME */}

            <Field label="Name">
              <input
                required
                value={collectionForm.name}
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    name: e.target.value,
                  })
                }
                className="field"
                placeholder="e.g. Aura Blaze Iconic Edition"
              />
            </Field>

            {/* SLUG */}

            <Field label="URL slug">
              <input
                required
                value={collectionForm.slug}
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    slug: e.target.value,
                  })
                }
                className="field"
                placeholder="e.g. iconic-edition"
              />
            </Field>

            {/* =========================
                COLLECTION PHOTO
            ========================== */}

            <Field
              label={
                collectionForm.id
                  ? 'Collection photo (optional)'
                  : 'Collection photo (required)'
              }
            >
              <label className="block border border-dashed border-hairline p-3 cursor-pointer hover:border-blaze">
                {collectionFile ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={URL.createObjectURL(
                        collectionFile
                      )}
                      alt="Collection preview"
                      className="w-16 h-20 object-cover"
                    />

                    <div>
                      <p className="text-xs">
                        {
                          collectionFile.name
                        }
                      </p>

                      <p className="text-[11px] text-grey mt-1">
                        Click to choose a
                        different photo
                      </p>
                    </div>
                  </div>
                ) : collectionForm.image_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        collectionForm.image_url
                      }
                      alt={
                        collectionForm.name
                      }
                      className="w-16 h-20 object-cover"
                    />

                    <div>
                      <p className="text-xs">
                        Current collection
                        photo
                      </p>

                      <p className="text-[11px] text-grey mt-1">
                        Click to replace it
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-grey">
                    Click to upload collection
                    photo
                  </span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  required={
                    !collectionForm.id &&
                    !collectionFile
                  }
                  className="hidden"
                  onChange={(e) =>
                    setCollectionFile(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                />
              </label>
            </Field>

            {/* SORT ORDER */}

            <Field label="Sort order">
              <input
                type="number"
                value={
                  collectionForm.sort_order ??
                  0
                }
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    sort_order:
                      e.target.value,
                  })
                }
                className="field"
              />
            </Field>

            <Submit saving={saving} />

            <p className="text-[11px] text-grey">
              A collection photo is required
              when creating a new collection.
              You can replace the photo when
              editing an existing collection.
            </p>
          </form>
        </Modal>
      )}
    </div>
  )
}

// =========================
// REUSABLE COMPONENTS
// =========================

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs text-grey block mb-1.5">
        {label}
      </span>

      {children}
    </label>
  )
}

function Submit({ saving }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="submit"
        disabled={saving}
        className="bg-void text-bone px-5 py-2.5 text-sm hover:bg-blaze disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-void/50 flex items-center justify-center p-5">
      <div className="bg-bone w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl tracking-wide">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}