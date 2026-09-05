// Nigerian states and commonly used delivery cities/areas.
// For FCT/Abuja, local districts such as Kubwa are preserved in the UI,
// while the Terminal API receives Abuja as the service city.
export const NIGERIA_LOCATIONS = [
  { state: 'Abia', cities: ['Aba', 'Umuahia'] },
  { state: 'Adamawa', cities: ['Yola', 'Mubi', 'Jimeta'] },
  { state: 'Akwa Ibom', cities: ['Uyo', 'Eket', 'Ikot Ekpene'] },
  { state: 'Anambra', cities: ['Awka', 'Onitsha', 'Nnewi'] },
  { state: 'Bauchi', cities: ['Bauchi', 'Azare'] },
  { state: 'Bayelsa', cities: ['Yenagoa', 'Brass'] },
  { state: 'Benue', cities: ['Makurdi', 'Gboko', 'Otukpo'] },
  { state: 'Borno', cities: ['Maiduguri', 'Biu'] },
  { state: 'Cross River', cities: ['Calabar', 'Ogoja'] },
  { state: 'Delta', cities: ['Asaba', 'Warri', 'Sapele', 'Ughelli'] },
  { state: 'Ebonyi', cities: ['Abakaliki', 'Afikpo'] },
  { state: 'Edo', cities: ['Benin City', 'Auchi', 'Ekpoma'] },
  { state: 'Ekiti', cities: ['Ado-Ekiti', 'Ikere-Ekiti'] },
  { state: 'Enugu', cities: ['Enugu', 'Nsukka'] },
  { state: 'Abuja', cities: ['Abuja', 'Kubwa', 'Gwarinpa', 'Wuse', 'Maitama', 'Garki', 'Asokoro', 'Jabi', 'Lugbe', 'Nyanya', 'Karu', 'Bwari', 'Kuje', 'Dutse Alhaji', 'Utako'] },
  { state: 'Gombe', cities: ['Gombe', 'Kumo'] },
  { state: 'Imo', cities: ['Owerri', 'Orlu', 'Okigwe'] },
  { state: 'Jigawa', cities: ['Dutse', 'Hadejia', 'Gumel'] },
  { state: 'Kaduna', cities: ['Kaduna', 'Zaria', 'Kafanchan'] },
  { state: 'Kano', cities: ['Kano', 'Wudil'] },
  { state: 'Katsina', cities: ['Katsina', 'Funtua', 'Daura'] },
  { state: 'Kebbi', cities: ['Birnin Kebbi', 'Argungu'] },
  { state: 'Kogi', cities: ['Lokoja', 'Okene', 'Idah'] },
  { state: 'Kwara', cities: ['Ilorin', 'Offa', 'Jebba'] },
  { state: 'Lagos', cities: ['Lagos', 'Ikeja', 'Lekki', 'Surulere', 'Yaba', 'Ikorodu', 'Badagry'] },
  { state: 'Nasarawa', cities: ['Lafia', 'Keffi', 'Karu'] },
  { state: 'Niger', cities: ['Minna', 'Suleja', 'Bida'] },
  { state: 'Ogun', cities: ['Abeokuta', 'Ijebu-Ode', 'Sagamu', 'Ota'] },
  { state: 'Ondo', cities: ['Akure', 'Ondo', 'Owo'] },
  { state: 'Osun', cities: ['Osogbo', 'Ile-Ife', 'Ilesa', 'Ede'] },
  { state: 'Oyo', cities: ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin'] },
  { state: 'Plateau', cities: ['Jos', 'Bukuru', 'Pankshin'] },
  { state: 'Rivers', cities: ['Port Harcourt', 'Bonny', 'Bori', 'Degema', 'Okrika', 'Eleme'] },
  { state: 'Sokoto', cities: ['Sokoto', 'Gwadabawa'] },
  { state: 'Taraba', cities: ['Jalingo', 'Wukari', 'Bali'] },
  { state: 'Yobe', cities: ['Damaturu', 'Potiskum', 'Nguru'] },
  { state: 'Zamfara', cities: ['Gusau', 'Kaura Namoda'] },
]

export const NIGERIA_STATES = NIGERIA_LOCATIONS.map((entry) => entry.state)

export function getNigeriaCities(state) {
  return NIGERIA_LOCATIONS.find((entry) => entry.state === state)?.cities || []
}
