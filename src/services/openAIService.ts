import OpenAI from 'openai';
import { config, logger } from '../config/development';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// Vérification de la présence de la clé API
if (!API_KEY) {
  logger.error('Variable d\'environnement manquante: VITE_OPENAI_API_KEY');
  console.error('Variable d\'environnement manquante: VITE_OPENAI_API_KEY');
}

// Initialisation du client OpenAI
const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true // Nécessaire pour l'utilisation côté client
});

export interface EnvironmentDetection {
  segment: string;
  environment: string;
  soundEffects: string[];
  emotionalTone: string;
  speechRate: string;
  volume: string;
}

/**
 * Analyse un texte pour détecter les environnements et les émotions
 * @param text Le texte à analyser
 * @returns Une liste de segments avec leurs environnements et paramètres vocaux
 */
export const analyzeTextEnvironments = async (text: string): Promise<EnvironmentDetection[]> => {
  try {
    logger.group('Analyse du texte avec OpenAI');
    logger.info('Début de l\'analyse pour le texte:', text);

    const prompt = `
    Analyse ce texte et identifie pour chaque paragraphe ou segment naturel :
    1. L'environnement ou le cadre de la scène (ex: plage, forêt, chambre, etc.)
    2. Les effets sonores qui correspondraient à cet environnement
    3. Le ton émotionnel dominant (sensuel, intense, jouissance, murmure, etc.)
    4. Le débit de parole recommandé (très lent, lent, modéré, rapide)
    5. Le volume recommandé (doux, normal, fort)

    Réponds au format JSON avec cette structure exacte :
    [
      {
        "segment": "texte du segment",
        "environment": "nom de l'environnement",
        "soundEffects": ["son1", "son2"],
        "emotionalTone": "ton émotionnel",
        "speechRate": "débit de parole",
        "volume": "volume"
      }
    ]

    N'inclus aucun autre texte dans ta réponse, seulement le JSON.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Tu es un assistant spécialisé dans l\'analyse de textes érotiques pour la génération audio.' },
        { role: 'user', content: prompt + '\n\nTexte à analyser:\n' + text }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Réponse vide de l\'API OpenAI');
    }

    // Parsing de la réponse JSON
    const parsedResponse = JSON.parse(content);
    const results = parsedResponse.segments || parsedResponse;

    logger.debug('Résultats de l\'analyse:', results);
    logger.groupEnd();

    return results;
  } catch (error) {
    logger.error('Erreur lors de l\'analyse du texte avec OpenAI:', error);
    throw new Error('Échec de l\'analyse du texte');
  }
};

/**
 * Mappe un environnement à des fichiers audio
 * @param environment Le nom de l'environnement
 * @returns Une liste d'URLs de fichiers audio
 */
export const mapEnvironmentToSounds = (environment: string): string[] => {
  // Mapping des environnements aux fichiers audio
  const environmentSounds: Record<string, string[]> = {
    plage: ['ocean_waves.mp3', 'seagulls.mp3'],
    mer: ['ocean_waves.mp3', 'seagulls.mp3'],
    océan: ['ocean_waves.mp3', 'seagulls.mp3'],
    forêt: ['forest_ambience.mp3', 'birds_chirping.mp3'],
    bois: ['forest_ambience.mp3', 'birds_chirping.mp3'],
    pluie: ['rain.mp3', 'thunder.mp3'],
    orage: ['thunder.mp3', 'rain_heavy.mp3'],
    ville: ['city_traffic.mp3', 'crowd_murmur.mp3'],
    rue: ['city_traffic.mp3', 'footsteps.mp3'],
    restaurant: ['restaurant_ambience.mp3', 'dishes_clinking.mp3'],
    café: ['cafe_ambience.mp3', 'coffee_machine.mp3'],
    bureau: ['office_ambience.mp3', 'keyboard_typing.mp3'],
    chambre: ['bedroom_ambience.mp3', 'sheets_rustling.mp3'],
    lit: ['bedroom_ambience.mp3', 'sheets_rustling.mp3'],
    douche: ['shower_water.mp3', 'bathroom_echo.mp3'],
    salle_de_bain: ['bathroom_ambience.mp3', 'water_dripping.mp3'],
    voiture: ['car_interior.mp3', 'engine_running.mp3'],
    train: ['train_moving.mp3', 'train_whistle.mp3'],
    avion: ['airplane_cabin.mp3', 'airplane_engine.mp3'],
    nature: ['nature_ambience.mp3', 'birds_distant.mp3'],
    campagne: ['countryside_ambience.mp3', 'farm_animals.mp3'],
    montagne: ['mountain_wind.mp3', 'eagle_cry.mp3'],
    rivière: ['river_flowing.mp3', 'water_splash.mp3'],
    lac: ['lake_ambience.mp3', 'water_lapping.mp3'],
    fête: ['party_ambience.mp3', 'people_laughing.mp3'],
    boîte_de_nuit: ['nightclub_music.mp3', 'crowd_dancing.mp3'],
    concert: ['concert_crowd.mp3', 'applause.mp3'],
    église: ['church_ambience.mp3', 'church_bells.mp3'],
    temple: ['temple_ambience.mp3', 'prayer_bells.mp3'],
    jardin: ['garden_ambience.mp3', 'insects_buzzing.mp3'],
    parc: ['park_ambience.mp3', 'children_playing.mp3'],
    bibliothèque: ['library_ambience.mp3', 'pages_turning.mp3'],
    école: ['school_ambience.mp3', 'school_bell.mp3'],
    hôpital: ['hospital_ambience.mp3', 'heart_monitor.mp3'],
    laboratoire: ['laboratory_ambience.mp3', 'bubbling_liquid.mp3'],
    espace: ['space_ambience.mp3', 'spacecraft_hum.mp3'],
    vaisseau_spatial: ['spacecraft_interior.mp3', 'computer_beeps.mp3'],
    sous_marin: ['submarine_interior.mp3', 'sonar_ping.mp3'],
    grotte: ['cave_dripping.mp3', 'cave_echo.mp3'],
    désert: ['desert_wind.mp3', 'sand_blowing.mp3'],
    jungle: ['jungle_ambience.mp3', 'exotic_birds.mp3'],
    savane: ['savanna_ambience.mp3', 'lion_roar_distant.mp3'],
    ferme: ['farm_ambience.mp3', 'farm_animals.mp3'],
    château: ['castle_ambience.mp3', 'stone_echo.mp3'],
    ruines: ['ruins_ambience.mp3', 'wind_through_ruins.mp3'],
    usine: ['factory_machinery.mp3', 'industrial_sounds.mp3'],
    mine: ['mine_ambience.mp3', 'pickaxe_hitting_rock.mp3'],
    port: ['harbor_ambience.mp3', 'boat_horns.mp3'],
    aéroport: ['airport_ambience.mp3', 'airport_announcements.mp3'],
    gare: ['train_station_ambience.mp3', 'train_announcement.mp3'],
    marché: ['market_ambience.mp3', 'market_vendors.mp3'],
    centre_commercial: ['mall_ambience.mp3', 'shopping_bags.mp3'],
    stade: ['stadium_crowd.mp3', 'sports_whistle.mp3'],
    gymnase: ['gym_ambience.mp3', 'workout_sounds.mp3'],
    piscine: ['swimming_pool_ambience.mp3', 'water_splashing.mp3'],
    sauna: ['sauna_ambience.mp3', 'steam_hissing.mp3'],
    spa: ['spa_ambience.mp3', 'relaxing_music.mp3'],
    salon: ['living_room_ambience.mp3', 'tv_background.mp3'],
    cuisine: ['kitchen_ambience.mp3', 'cooking_sounds.mp3'],
    salle_à_manger: ['dining_room_ambience.mp3', 'cutlery_sounds.mp3'],
    grenier: ['attic_ambience.mp3', 'creaking_wood.mp3'],
    cave: ['basement_ambience.mp3', 'pipes_humming.mp3'],
    jardin_d_hiver: ['winter_garden_ambience.mp3', 'glass_greenhouse.mp3'],
    terrasse: ['terrace_ambience.mp3', 'outdoor_dining.mp3'],
    balcon: ['balcony_ambience.mp3', 'city_view.mp3'],
    ascenseur: ['elevator_ambience.mp3', 'elevator_ding.mp3'],
    escalier: ['stairwell_ambience.mp3', 'footsteps_stairs.mp3'],
    couloir: ['hallway_ambience.mp3', 'distant_voices.mp3'],
    vestiaire: ['locker_room_ambience.mp3', 'locker_doors.mp3'],
    toilettes: ['bathroom_ambience.mp3', 'toilet_flush.mp3'],
    bureau_privé: ['private_office_ambience.mp3', 'leather_chair.mp3'],
    salle_de_réunion: ['meeting_room_ambience.mp3', 'presentation.mp3'],
    salle_de_classe: ['classroom_ambience.mp3', 'chalk_on_board.mp3'],
    amphithéâtre: ['lecture_hall_ambience.mp3', 'student_murmurs.mp3'],
    laboratoire_scientifique: ['science_lab_ambience.mp3', 'lab_equipment.mp3'],
    salle_d_opération: ['operating_room_ambience.mp3', 'medical_equipment.mp3'],
    cabinet_médical: ['doctors_office_ambience.mp3', 'medical_examination.mp3'],
    salle_d_attente: ['waiting_room_ambience.mp3', 'receptionist_typing.mp3'],
    tribunal: ['courtroom_ambience.mp3', 'gavel_bang.mp3'],
    prison: ['prison_ambience.mp3', 'cell_door_closing.mp3'],
    commissariat: ['police_station_ambience.mp3', 'police_radio.mp3'],
    caserne_de_pompiers: ['fire_station_ambience.mp3', 'fire_alarm.mp3'],
    base_militaire: ['military_base_ambience.mp3', 'marching_soldiers.mp3'],
    champ_de_bataille: ['battlefield_ambience.mp3', 'distant_explosions.mp3'],
    cimetière: ['cemetery_ambience.mp3', 'wind_through_trees.mp3'],
    morgue: ['morgue_ambience.mp3', 'refrigeration_units.mp3'],
    maison_hantée: ['haunted_house_ambience.mp3', 'creaking_floorboards.mp3'],
    château_hanté: ['haunted_castle_ambience.mp3', 'ghostly_whispers.mp3'],
    fête_foraine: ['fairground_ambience.mp3', 'carousel_music.mp3'],
    parc_d_attractions: ['amusement_park_ambience.mp3', 'roller_coaster.mp3'],
    zoo: ['zoo_ambience.mp3', 'animal_sounds.mp3'],
    aquarium: ['aquarium_ambience.mp3', 'bubbling_water.mp3'],
    musée: ['museum_ambience.mp3', 'quiet_footsteps.mp3'],
    galerie_d_art: ['art_gallery_ambience.mp3', 'quiet_conversations.mp3'],
    théâtre: ['theater_ambience.mp3', 'audience_applause.mp3'],
    cinéma: ['cinema_ambience.mp3', 'film_projector.mp3'],
    opéra: ['opera_house_ambience.mp3', 'orchestra_tuning.mp3'],
    salle_de_concert: ['concert_hall_ambience.mp3', 'audience_murmur.mp3'],
    studio_d_enregistrement: ['recording_studio_ambience.mp3', 'microphone_check.mp3'],
    plateau_de_tournage: ['film_set_ambience.mp3', 'director_calling_action.mp3'],
    backstage: ['backstage_ambience.mp3', 'performers_preparing.mp3'],
    loge: ['dressing_room_ambience.mp3', 'makeup_application.mp3'],
    casino: ['casino_ambience.mp3', 'slot_machines.mp3'],
    bar: ['bar_ambience.mp3', 'glasses_clinking.mp3'],
    pub: ['pub_ambience.mp3', 'beer_pouring.mp3'],
    discothèque: ['disco_ambience.mp3', 'dance_music.mp3'],
    club: ['nightclub_ambience.mp3', 'bass_heavy_music.mp3'],
    restaurant_chic: ['upscale_restaurant_ambience.mp3', 'wine_pouring.mp3'],
    fast_food: ['fast_food_restaurant_ambience.mp3', 'order_counter.mp3'],
    café_terrasse: ['outdoor_cafe_ambience.mp3', 'street_sounds.mp3'],
    boulangerie: ['bakery_ambience.mp3', 'bread_baking.mp3'],
    épicerie: ['grocery_store_ambience.mp3', 'checkout_beep.mp3'],
    supermarché: ['supermarket_ambience.mp3', 'shopping_cart.mp3'],
    boutique: ['boutique_ambience.mp3', 'clothes_hangers.mp3'],
    magasin: ['store_ambience.mp3', 'cash_register.mp3'],
    salon_de_coiffure: ['hair_salon_ambience.mp3', 'hair_dryer.mp3'],
    spa_de_beauté: ['beauty_spa_ambience.mp3', 'relaxation_music.mp3'],
    gymnase_de_sport: ['gym_ambience.mp3', 'weight_lifting.mp3'],
    piscine_intérieure: ['indoor_pool_ambience.mp3', 'swimming_sounds.mp3'],
    piscine_extérieure: ['outdoor_pool_ambience.mp3', 'pool_party.mp3'],
    terrain_de_tennis: ['tennis_court_ambience.mp3', 'tennis_ball_hit.mp3'],
    terrain_de_golf: ['golf_course_ambience.mp3', 'golf_swing.mp3'],
    terrain_de_football: ['football_field_ambience.mp3', 'referee_whistle.mp3'],
    terrain_de_basketball: ['basketball_court_ambience.mp3', 'basketball_dribble.mp3'],
    patinoire: ['ice_rink_ambience.mp3', 'ice_skating.mp3'],
    piste_de_ski: ['ski_slope_ambience.mp3', 'skiing_sounds.mp3'],
    plage_privée: ['private_beach_ambience.mp3', 'exclusive_resort.mp3'],
    île_déserte: ['deserted_island_ambience.mp3', 'distant_waves.mp3'],
    oasis: ['oasis_ambience.mp3', 'water_in_desert.mp3'],
    volcan: ['volcano_ambience.mp3', 'lava_bubbling.mp3'],
    cascade: ['waterfall_ambience.mp3', 'rushing_water.mp3'],
    source_thermale: ['hot_spring_ambience.mp3', 'steam_rising.mp3'],
    glacier: ['glacier_ambience.mp3', 'ice_cracking.mp3'],
    banquise: ['ice_shelf_ambience.mp3', 'arctic_wind.mp3'],
    toundra: ['tundra_ambience.mp3', 'arctic_animals.mp3'],
    steppe: ['steppe_ambience.mp3', 'grassland_wind.mp3'],
    prairie: ['prairie_ambience.mp3', 'tall_grass_rustling.mp3'],
    champ_de_blé: ['wheat_field_ambience.mp3', 'grain_rustling.mp3'],
    champ_de_lavande: ['lavender_field_ambience.mp3', 'bees_buzzing.mp3'],
    verger: ['orchard_ambience.mp3', 'fruit_picking.mp3'],
    vignoble: ['vineyard_ambience.mp3', 'grape_harvesting.mp3'],
    oliveraie: ['olive_grove_ambience.mp3', 'mediterranean_breeze.mp3'],
    plantation_de_thé: ['tea_plantation_ambience.mp3', 'tea_leaves_rustling.mp3'],
    rizière: ['rice_paddy_ambience.mp3', 'water_irrigation.mp3'],
    bambouseraie: ['bamboo_forest_ambience.mp3', 'bamboo_creaking.mp3'],
    mangrove: ['mangrove_ambience.mp3', 'water_through_roots.mp3'],
    marais: ['marsh_ambience.mp3', 'frogs_croaking.mp3'],
    bayou: ['bayou_ambience.mp3', 'swamp_sounds.mp3'],
    récif_corallien: ['coral_reef_ambience.mp3', 'underwater_bubbles.mp3'],
    fond_marin: ['ocean_floor_ambience.mp3', 'deep_sea_sounds.mp3'],
    épave: ['shipwreck_ambience.mp3', 'underwater_creaking.mp3'],
    navire: ['ship_deck_ambience.mp3', 'ocean_waves_on_hull.mp3'],
    yacht: ['yacht_ambience.mp3', 'luxury_boat_engine.mp3'],
    voilier: ['sailboat_ambience.mp3', 'sails_in_wind.mp3'],
    croisière: ['cruise_ship_ambience.mp3', 'ship_horn.mp3'],
    phare: ['lighthouse_ambience.mp3', 'foghorn.mp3'],
    île: ['island_ambience.mp3', 'tropical_birds.mp3'],
    atoll: ['atoll_ambience.mp3', 'lagoon_water.mp3'],
    lagon: ['lagoon_ambience.mp3', 'gentle_waves.mp3'],
    calanque: ['cove_ambience.mp3', 'secluded_beach.mp3'],
    falaise: ['cliff_ambience.mp3', 'wind_on_rocks.mp3'],
    canyon: ['canyon_ambience.mp3', 'echo_in_canyon.mp3'],
    gorge: ['gorge_ambience.mp3', 'river_below.mp3'],
    vallée: ['valley_ambience.mp3', 'distant_farm.mp3'],
    colline: ['hill_ambience.mp3', 'hilltop_wind.mp3'],
    montagne_enneigée: ['snowy_mountain_ambience.mp3', 'snow_crunching.mp3'],
    sommet: ['mountain_peak_ambience.mp3', 'thin_air_wind.mp3'],
    refuge: ['mountain_cabin_ambience.mp3', 'fireplace_crackling.mp3'],
    cabane: ['cabin_ambience.mp3', 'wooden_structure_creaking.mp3'],
    chalet: ['chalet_ambience.mp3', 'alpine_atmosphere.mp3'],
    igloo: ['igloo_ambience.mp3', 'snow_insulation.mp3'],
    tente: ['tent_ambience.mp3', 'canvas_flapping.mp3'],
    camping: ['campsite_ambience.mp3', 'tent_zipping.mp3'],
    feu_de_camp: ['campfire_ambience.mp3', 'wood_crackling.mp3'],
    clairière: ['clearing_ambience.mp3', 'forest_opening.mp3'],
    sous_bois: ['forest_floor_ambience.mp3', 'leaves_underfoot.mp3'],
    sentier: ['trail_ambience.mp3', 'hiking_footsteps.mp3'],
    chemin: ['path_ambience.mp3', 'walking_on_gravel.mp3'],
    route: ['road_ambience.mp3', 'passing_cars.mp3'],
    autoroute: ['highway_ambience.mp3', 'fast_traffic.mp3'],
    pont: ['bridge_ambience.mp3', 'cars_on_bridge.mp3'],
    tunnel: ['tunnel_ambience.mp3', 'echo_in_tunnel.mp3'],
    métro: ['subway_ambience.mp3', 'train_arriving.mp3'],
    quai: ['platform_ambience.mp3', 'train_announcement.mp3'],
    wagon: ['train_car_ambience.mp3', 'train_movement.mp3'],
    cabine: ['cabin_interior_ambience.mp3', 'small_space_echo.mp3'],
    cockpit: ['cockpit_ambience.mp3', 'airplane_controls.mp3'],
    soute: ['cargo_hold_ambience.mp3', 'luggage_compartment.mp3'],
    hangar: ['hangar_ambience.mp3', 'large_empty_space.mp3'],
    entrepôt: ['warehouse_ambience.mp3', 'forklift_beeping.mp3'],
    dock: ['loading_dock_ambience.mp3', 'trucks_backing_up.mp3'],
    quai_de_chargement: ['shipping_dock_ambience.mp3', 'container_loading.mp3'],
    container: ['shipping_container_ambience.mp3', 'metal_box_echo.mp3'],
    cale: ['ship_hold_ambience.mp3', 'below_deck.mp3'],
    pont_de_navire: ['ship_deck_ambience.mp3', 'ocean_spray.mp3'],
    passerelle: ['gangway_ambience.mp3', 'boarding_ship.mp3'],
    jetée: ['pier_ambience.mp3', 'water_under_boardwalk.mp3'],
    embarcadère: ['dock_ambience.mp3', 'boats_moored.mp3'],
    marina: ['marina_ambience.mp3', 'boats_bobbing.mp3'],
    port_de_plaisance: ['yacht_harbor_ambience.mp3', 'rigging_sounds.mp3'],
    crique: ['cove_ambience.mp3', 'hidden_beach.mp3'],
    baie: ['bay_ambience.mp3', 'protected_waters.mp3'],
    golfe: ['gulf_ambience.mp3', 'open_water.mp3'],
    détroit: ['strait_ambience.mp3', 'narrow_waters.mp3'],
    fjord: ['fjord_ambience.mp3', 'steep_cliffs.mp3'],
    estuaire: ['estuary_ambience.mp3', 'river_meeting_sea.mp3'],
    delta: ['river_delta_ambience.mp3', 'multiple_channels.mp3'],
    marécage: ['swamp_ambience.mp3', 'murky_water.mp3'],
    tourbière: ['bog_ambience.mp3', 'bubbling_mud.mp3'],
    étang: ['pond_ambience.mp3', 'frogs_and_insects.mp3'],
    mare: ['small_pond_ambience.mp3', 'water_insects.mp3'],
    bassin: ['pool_ambience.mp3', 'fountain_water.mp3'],
    fontaine: ['fountain_ambience.mp3', 'water_splashing.mp3'],
    puits: ['well_ambience.mp3', 'water_echoing.mp3'],
    source: ['spring_ambience.mp3', 'water_bubbling.mp3'],
    ruisseau: ['stream_ambience.mp3', 'babbling_brook.mp3'],
    torrent: ['rushing_stream_ambience.mp3', 'fast_water.mp3'],
    rapides: ['rapids_ambience.mp3', 'white_water.mp3'],
    chute_d_eau: ['waterfall_ambience.mp3', 'falling_water.mp3'],
    barrage: ['dam_ambience.mp3', 'water_release.mp3'],
    écluse: ['lock_ambience.mp3', 'water_level_changing.mp3'],
    canal: ['canal_ambience.mp3', 'narrow_waterway.mp3'],
    aqueduc: ['aqueduct_ambience.mp3', 'water_flowing_above.mp3'],
    citerne: ['cistern_ambience.mp3', 'water_storage.mp3'],
    réservoir: ['reservoir_ambience.mp3', 'large_water_body.mp3'],
    piscine_naturelle: ['natural_pool_ambience.mp3', 'rock_pool.mp3'],
    bain_thermal: ['thermal_bath_ambience.mp3', 'hot_water_bubbling.mp3'],
    bain_à_remous: ['hot_tub_ambience.mp3', 'bubbling_jets.mp3'],
    hammam: ['steam_room_ambience.mp3', 'steam_hissing.mp3'],
    banya: ['russian_bathhouse_ambience.mp3', 'steam_and_birch.mp3'],
    onsen: ['japanese_hot_spring_ambience.mp3', 'traditional_bath.mp3'],
    bain_public: ['public_bath_ambience.mp3', 'echoing_water.mp3'],
    thermes: ['roman_baths_ambience.mp3', 'ancient_spa.mp3'],
    piscine_olympique: ['olympic_pool_ambience.mp3', 'swimming_competition.mp3'],
    bassin_de_natation: ['swimming_pool_ambience.mp3', 'lap_swimming.mp3'],
    plongeoir: ['diving_board_ambience.mp3', 'splash_into_water.mp3'],
    toboggan_aquatique: ['water_slide_ambience.mp3', 'people_sliding.mp3'],
    parc_aquatique: ['water_park_ambience.mp3', 'water_attractions.mp3'],
    plage_de_sable: ['sandy_beach_ambience.mp3', 'sand_underfoot.mp3'],
    plage_de_galets: ['pebble_beach_ambience.mp3', 'stones_shifting.mp3'],
    dune: ['sand_dune_ambience.mp3', 'wind_on_sand.mp3'],
    oasis_désertique: ['desert_oasis_ambience.mp3', 'water_in_desert.mp3'],
    palmeraie: ['palm_grove_ambience.mp3', 'palm_leaves_rustling.mp3'],
    jungle_tropicale: ['tropical_jungle_ambience.mp3', 'exotic_wildlife.mp3'],
    forêt_tropicale: ['rainforest_ambience.mp3', 'tropical_rain.mp3'],
    forêt_tempérée: ['temperate_forest_ambience.mp3', 'seasonal_woods.mp3'],
    forêt_de_conifères: ['coniferous_forest_ambience.mp3', 'pine_trees.mp3'],
    forêt_de_bouleaux: ['birch_forest_ambience.mp3', 'birch_leaves.mp3'],
    forêt_d_automne: ['autumn_forest_ambience.mp3', 'falling_leaves.mp3'],
    forêt_enneigée: ['snowy_forest_ambience.mp3', 'snow_falling_from_trees.mp3'],
    forêt_brumeuse: ['misty_forest_ambience.mp3', 'fog_in_trees.mp3'],
    forêt_enchantée: ['enchanted_forest_ambience.mp3', 'magical_sounds.mp3'],
    forêt_hantée: ['haunted_forest_ambience.mp3', 'spooky_trees.mp3'],
    clairière_ensoleillée: ['sunny_clearing_ambience.mp3', 'warm_forest_opening.mp3'],
    clairière_de_fées: ['fairy_clearing_ambience.mp3', 'magical_glade.mp3'],
    grotte_marine: ['sea_cave_ambience.mp3', 'waves_in_cave.mp3'],
    grotte_de_glace: ['ice_cave_ambience.mp3', 'frozen_echoes.mp3'],
    grotte_de_cristal: ['crystal_cave_ambience.mp3', 'gem_resonance.mp3'],
    caverne: ['cavern_ambience.mp3', 'large_underground_space.mp3'],
    gouffre: ['chasm_ambience.mp3', 'deep_pit_echo.mp3'],
    abîme: ['abyss_ambience.mp3', 'bottomless_depth.mp3'],
    souterrain: ['underground_passage_ambience.mp3', 'tunnel_echo.mp3'],
    catacombe: ['catacombs_ambience.mp3', 'ancient_burial.mp3'],
    crypte: ['crypt_ambience.mp3', 'tomb_echo.mp3'],
    mausolée: ['mausoleum_ambience.mp3', 'stone_tomb.mp3'],
    tombeau: ['tomb_ambience.mp3', 'ancient_burial_chamber.mp3'],
    pyramide: ['pyramid_ambience.mp3', 'ancient_egyptian.mp3'],
    temple_ancien: ['ancient_temple_ambience.mp3', 'old_stone_echo.mp3'],
    temple_grec: ['greek_temple_ambience.mp3', 'classical_columns.mp3'],
    temple_romain: ['roman_temple_ambience.mp3', 'ancient_rome.mp3'],
    bureau_moderne: ['modern_office_ambience.mp3', 'office_equipment.mp3']
  };

  // Normaliser l'environnement (minuscules, sans accents)
  const normalizedEnv = environment.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_');

  // Rechercher l'environnement dans le mapping
  for (const [env, sounds] of Object.entries(environmentSounds)) {
    const normalizedKey = env.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '_');
    
    if (normalizedEnv.includes(normalizedKey) || normalizedKey.includes(normalizedEnv)) {
      return sounds;
    }
  }

  // Environnement par défaut si aucune correspondance n'est trouvée
  return ['ambient_background.mp3'];
};
