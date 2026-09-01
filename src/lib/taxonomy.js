import { supabase } from './supabase'

// ============================================================
// FALLBACK TAXONOMY
// ============================================================

export const fallbackCategories = [
  {
    id: 'tshirts',
    name: 'T-Shirts',
    slug: 'tshirts',
    tagline: 'Oversized. Everyday.',
    sort_order: 1,
    collections: [
      {
        id: 'tshirts-iconic-edition',
        name: 'Aura Blaze Iconic Edition',
        slug: 'iconic-edition',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'tshirts-deep-thoughts-edition',
        name: 'Aura Blaze Deep Thoughts Edition',
        slug: 'deep-thoughts-edition',
        sort_order: 2,
        image_url: '',
      },
      {
        id: 'tshirts-exclusive-edition',
        name: 'Aura Blaze Exclusive Edition',
        slug: 'exclusive-edition',
        sort_order: 3,
        image_url: '',
      },
    ],
  },

  {
    id: 'jackets',
    name: 'Jackets',
    slug: 'jackets',
    tagline: 'Weight that means something',
    sort_order: 2,
    collections: [
      {
        id: 'jackets-camo',
        name: 'Aura Blaze Camo Jacket',
        slug: 'camo-jacket',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'jackets-thick-checkered',
        name: 'Aura Blaze Thick Checkered',
        slug: 'thick-checkered',
        sort_order: 2,
        image_url: '',
      },
      {
        id: 'jackets-denim',
        name: 'Aura Blaze Denim Jacket',
        slug: 'denim-jacket',
        sort_order: 3,
        image_url: '',
      },
    ],
  },

  {
    id: 'shirts',
    name: 'Shirts',
    slug: 'shirts',
    tagline: 'Layered. Distinct.',
    sort_order: 3,
    collections: [
      {
        id: 'shirts-denim',
        name: 'Aura Blaze Denim Shirt',
        slug: 'denim-shirt',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'shirts-checkered',
        name: 'Aura Blaze Checkered Shirt',
        slug: 'checkered-shirt',
        sort_order: 2,
        image_url: '',
      },
      {
        id: 'shirts-special',
        name: 'Aura Blaze Special',
        slug: 'special',
        sort_order: 3,
        image_url: '',
      },
    ],
  },

  {
    id: 'headwear',
    name: 'Headwear',
    slug: 'headwear',
    tagline: 'Panel caps and everyday headwear',
    sort_order: 4,
    collections: [
      {
        id: 'headwear-5-panel',
        name: '5 Panel Cap',
        slug: '5-panel-cap',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'headwear-ripped',
        name: 'Ripped Cap',
        slug: 'ripped-cap',
        sort_order: 2,
        image_url: '',
      },
    ],
  },

  {
    id: 'jorts',
    name: 'Jorts',
    slug: 'jorts',
    tagline: 'Relaxed denim, reworked.',
    sort_order: 5,
    collections: [
      {
        id: 'jorts-regular',
        name: 'Regular Jort',
        slug: 'regular-jort',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'jorts-denim',
        name: 'Denim Jort',
        slug: 'denim-jort',
        sort_order: 2,
        image_url: '',
      },
    ],
  },

  {
    id: 'trousers',
    name: 'Trousers',
    slug: 'trousers',
    tagline: 'Built for movement.',
    sort_order: 6,
    collections: [
      {
        id: 'trousers-denim',
        name: 'Denim Pants',
        slug: 'denim-pants',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'trousers-baggy-regular',
        name: 'Baggy Regular Pants',
        slug: 'baggy-regular-pants',
        sort_order: 2,
        image_url: '',
      },
    ],
  },

  {
    id: 'quarter-zip',
    name: 'Quarter Zip',
    slug: 'quarter-zip',
    tagline: 'Clean layers, easy movement.',
    sort_order: 7,
    collections: [
      {
        id: 'quarter-zip-special',
        name: 'Aura Blaze Special Quarter Zip',
        slug: 'special-quarter-zip',
        sort_order: 1,
        image_url: '',
      },
    ],
  },

  {
    id: 'up-and-down',
    name: 'Up and Down',
    slug: 'up-and-down',
    tagline: 'Complete the look.',
    sort_order: 8,
    collections: [],
  },

  {
    id: 'joggers',
    name: 'Joggers',
    slug: 'joggers',
    tagline: 'Relaxed everyday essentials.',
    sort_order: 9,
    collections: [],
  },

  {
    id: 'tank-tops',
    name: 'Tank Tops',
    slug: 'tank-tops',
    tagline: 'Lightweight. Effortless.',
    sort_order: 10,
    collections: [
      {
        id: 'tank-tops-regular',
        name: 'Regular Tank Top',
        slug: 'regular-tank-top',
        sort_order: 1,
        image_url: '',
      },
      {
        id: 'tank-tops-creative-print',
        name: 'Creative Print Tank Top',
        slug: 'creative-print-tank-top',
        sort_order: 2,
        image_url: '',
      },
    ],
  },
]

// ============================================================
// HELPERS
// ============================================================

function assemble(categoryRows, collectionRows) {
  return (categoryRows || []).map((category) => ({
    ...category,

    collections: (collectionRows || [])
      .filter(
        (collection) =>
          collection.category_id === category.id
      )
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order
      ),
  }))
}

// ============================================================
// STOREFRONT TAXONOMY
// ============================================================

export async function fetchTaxonomy() {
  const {
    data: categoryRows,
    error: categoryError,
  } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })

  if (categoryError) {
    console.error(
      'Failed to fetch categories:',
      categoryError
    )

    return fallbackCategories
  }

  const {
    data: collectionRows,
    error: collectionError,
  } = await supabase
    .from('product_collections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })

  if (collectionError) {
    console.error(
      'Failed to fetch collections:',
      collectionError
    )

    return fallbackCategories
  }

  return assemble(
    categoryRows,
    collectionRows
  )
}

// ============================================================
// ADMIN TAXONOMY
// ============================================================

export async function fetchTaxonomyAdmin() {
  const {
    data: categoryRows,
    error: categoryError,
  } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order', {
      ascending: true,
    })

  if (categoryError) {
    throw categoryError
  }

  const {
    data: collectionRows,
    error: collectionError,
  } = await supabase
    .from('product_collections')
    .select('*')
    .order('sort_order', {
      ascending: true,
    })

  if (collectionError) {
    throw collectionError
  }

  return assemble(
    categoryRows,
    collectionRows
  )
}

// ============================================================
// CATEGORIES
// ============================================================

export async function createCategory({
  name,
  slug,
  tagline,
  sort_order = 0,
}) {
  const {
    data,
    error,
  } = await supabase
    .from('product_categories')
    .insert({
      name,
      slug,
      tagline,
      sort_order,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateCategory(
  id,
  updates
) {
  const {
    data,
    error,
  } = await supabase
    .from('product_categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteCategory(id) {
  const { error } =
    await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)

  if (error) {
    throw error
  }
}

// ============================================================
// COLLECTION IMAGE UPLOAD
// ============================================================

export async function uploadCollectionImage(
  slug,
  file
) {
  if (!file) {
    throw new Error(
      'No collection image selected.'
    )
  }

  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase() || 'jpg'

  const filePath = `collections/${slug}-${Date.now()}.${extension}`

  const {
    error: uploadError,
  } = await supabase.storage
    .from('collection-images')
    .upload(
      filePath,
      file,
      {
        cacheControl: '3600',
        upsert: false,
        contentType:
          file.type || 'image/jpeg',
      }
    )

  if (uploadError) {
    throw uploadError
  }

  const {
    data: publicUrlData,
  } =
    supabase.storage
      .from('collection-images')
      .getPublicUrl(filePath)

  if (
    !publicUrlData?.publicUrl
  ) {
    throw new Error(
      'Could not generate collection image URL.'
    )
  }

  return publicUrlData.publicUrl
}

// ============================================================
// COLLECTIONS
// ============================================================

export async function createCollection({
  categoryId,
  name,
  slug,
  sort_order = 0,
  image_url = '',
}) {
  const {
    data,
    error,
  } = await supabase
    .from('product_collections')
    .insert({
      category_id: categoryId,
      name,
      slug,
      sort_order,
      image_url,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateCollection(
  id,
  updates
) {
  const {
    data,
    error,
  } = await supabase
    .from('product_collections')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteCollection(
  id
) {
  const { error } =
    await supabase
      .from('product_collections')
      .delete()
      .eq('id', id)

  if (error) {
    throw error
  }
}