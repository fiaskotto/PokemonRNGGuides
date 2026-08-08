use crate::generators::gen4::wild::generated_wild4::{
    DIAMOND_ENTRIES, PEARL_ENTRIES, PLATINUM_ENTRIES,
};

use crate::generators::gen4::wild::wild_static::RawEntry;

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

fn entries_for_game(game: &str) -> &'static [RawEntry] {
    match game {
        "Diamond" => DIAMOND_ENTRIES,
        "Pearl" => PEARL_ENTRIES,
        "Platinum" => PLATINUM_ENTRIES,
        _ => &[],
    }
}

#[wasm_bindgen]
pub fn get_gen4_radar_locations(game: String) -> Vec<String> {
    entries_for_game(&game)
        .iter()
        .filter(|e| e.radar.iter().any(|s| !s.is_empty()))
        .map(|e| e.location.to_string())
        .collect()
}

#[derive(Clone, Debug, PartialEq, Eq, Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RadarSpeciesOpts {
    pub game: String,
    pub location: String,
    /// "Day" | "Night" | null
    pub time_of_day: Option<String>,
    pub swarm_active: bool,
    /// "Ruby" | "Sapphire" | "Emerald" | "FireRed" | "LeafGreen" | null
    pub dual_slot_game: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RadarSpecies {
    pub species: String,
    pub min_level: u32,
    pub max_level: u32,
}
