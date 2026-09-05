export const NIGERIA_LOCATIONS = {
  Abia: ['Aba', 'Umuahia'],
  Adamawa: ['Yola', 'Mubi', 'Jimeta'],
  'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene', 'Oron'],
  Anambra: ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia'],
  Bauchi: ['Bauchi', 'Azare', 'Misau'],
  Bayelsa: ['Yenagoa', 'Brass'],
  Benue: ['Makurdi', 'Gboko', 'Otukpo'],
  Borno: ['Maiduguri', 'Biu', 'Dikwa'],
  'Cross River': ['Calabar', 'Ogoja', 'Ikom'],
  Delta: ['Asaba', 'Warri', 'Sapele', 'Ughelli', 'Agbor'],
  Ebonyi: ['Abakaliki', 'Afikpo', 'Onueke'],
  Edo: ['Benin City', 'Auchi', 'Ekpoma', 'Uromi'],
  Ekiti: ['Ado-Ekiti', 'Ikere-Ekiti', 'Ikole-Ekiti'],
  Enugu: ['Enugu', 'Nsukka', 'Oji River'],
  'Federal Capital Territory': ['Abuja', 'Gwagwalada', 'Kuje', 'Bwari', 'Kubwa'],
  Imo: ['Owerri', 'Orlu', 'Okigwe'],
  Jigawa: ['Dutse', 'Hadejia', 'Gumel'],
  Kaduna: ['Kaduna', 'Zaria', 'Kafanchan'],
  Kano: ['Kano', 'Wudil', 'Gaya'],
  Katsina: ['Katsina', 'Funtua', 'Daura'],
  Kebbi: ['Birnin Kebbi', 'Argungu', 'Yauri'],
  Kogi: ['Lokoja', 'Okene', 'Idah', 'Anyigba'],
  Kwara: ['Ilorin', 'Offa', 'Jebba'],
  Lagos: ['Lagos', 'Ikeja', 'Lekki', 'Ikorodu', 'Badagry', 'Epe'],
  Nasarawa: ['Lafia', 'Keffi', 'Karu', 'Akwanga'],
  Niger: ['Minna', 'Suleja', 'Bida', 'Kontagora'],
  Ogun: ['Abeokuta', 'Ijebu-Ode', 'Sagamu', 'Ota', 'Ilaro'],
  Ondo: ['Akure', 'Ondo', 'Owo', 'Ikare'],
  Osun: ['Osogbo', 'Ile-Ife', 'Ilesa', 'Ede', 'Ikire'],
  Oyo: ['Ibadan', 'Ogbomosho', 'Oyo', 'Iseyin', 'Eruwa'],
  Plateau: ['Jos', 'Bukuru', 'Barkin Ladi', 'Pankshin'],
  Rivers: ['Port Harcourt', 'Bonny', 'Degema', 'Bori', 'Eleme', 'Okrika'],
  Sokoto: ['Sokoto', 'Tambuwal', 'Wurno'],
  Taraba: ['Jalingo', 'Wukari', 'Gembu'],
  Yobe: ['Damaturu', 'Potiskum', 'Gashua'],
  Zamfara: ['Gusau', 'Kaura Namoda', 'Talata Mafara'],
}

export const NIGERIA_STATES = Object.keys(NIGERIA_LOCATIONS)

export function getCitiesForState(state) {
  return NIGERIA_LOCATIONS[state] || []
}
