export const XRAY_PAGES = [
  { id:"physician", label:"Physician Profile", path:"/physician/jun-kong" },
  { id:"doctor-search", label:"Doctor Search", path:"/doctors/family-medicine" },
  { id:"location", label:"Clinic Finder", path:"/locations/clinic" },
];

export const LAYER_META = [
  { num:1, label:"Visual Render",    desc:"What the user sees",       color:"#22D3EE" },
  { num:2, label:"Content / Text",   desc:"Raw text content layer",   color:"#A8A9C0" },
  { num:3, label:"HTML / DOM",       desc:"Document structure",       color:"#F59E0B" },
  { num:4, label:"CSS / Styles",     desc:"Styling & layout rules",   color:"#EC4899" },
  { num:5, label:"Network / APIs",   desc:"API requests & responses", color:"#6366F1" },
  { num:6, label:"Data / Schema",    desc:"Underlying data model",    color:"#10B981" },
];

// Layer content for the physician profile page
export function getLayerContent(pageId, layerNum) {
  if (pageId === "physician") {
    switch(layerNum) {
      case 1: return {type:"visual", content: physicianVisualLayer};
      case 2: return {type:"text", content: physicianTextLayer};
      case 3: return {type:"code", lang:"html", content: physicianHTMLLayer};
      case 4: return {type:"code", lang:"css", content: physicianCSSLayer};
      case 5: return {type:"api", content: physicianAPILayer};
      case 6: return {type:"data", content: physicianDataLayer};
      default: return {type:"text", content:""};
    }
  }
  if (pageId === "doctor-search") {
    switch(layerNum) {
      case 1: return {type:"visual", content: searchVisualLayer};
      case 2: return {type:"text", content: searchTextLayer};
      case 3: return {type:"code", lang:"html", content: searchHTMLLayer};
      case 4: return {type:"code", lang:"css", content: searchCSSLayer};
      case 5: return {type:"api", content: searchAPILayer};
      case 6: return {type:"data", content: searchDataLayer};
      default: return {type:"text", content:""};
    }
  }
  // location
  switch(layerNum) {
    case 1: return {type:"visual", content: locationVisualLayer};
    case 2: return {type:"text", content: locationTextLayer};
    case 3: return {type:"code", lang:"html", content: locationHTMLLayer};
    case 4: return {type:"code", lang:"css", content: locationCSSLayer};
    case 5: return {type:"api", content: locationAPILayer};
    case 6: return {type:"data", content: locationDataLayer};
    default: return {type:"text", content:""};
  }
}

// ── Physician page layers ────────────────────────────────────────────────────

const physicianVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span>
      <div style={{display:"flex",gap:16}}>{["Find a Doctor","Locations","Services","MyBSWHealth"].map(l=><span key={l} style={{color:"rgba(255,255,255,.8)",fontSize:12}}>{l}</span>)}</div>
    </div>
    <div style={{padding:"20px 24px",display:"flex",gap:20}}>
      <div style={{width:90,height:110,borderRadius:10,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",flexShrink:0}}>JK</div>
      <div style={{flex:1}}>
        <div style={{fontSize:18,fontWeight:700,color:"#003C71",marginBottom:2}}>Jun Kong, MD</div>
        <div style={{fontSize:13,color:"#555",marginBottom:8}}>Internal Medicine · Gastroenterology</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {["Accepting New Patients","Video Visits Available"].map(b=><span key={b} style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:"#E8F5E9",color:"#2E7D32"}}>{b}</span>)}
        </div>
        <div style={{background:"#F5F5F5",borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:"#333",marginBottom:6}}>Next available appointments</div>
          <div style={{display:"flex",gap:8}}>
            {[{d:"Mon, Jun 16",t:"9:30 AM"},{d:"Mon, Jun 16",t:"2:15 PM"},{d:"Tue, Jun 17",t:"10:00 AM"}].map((s,i)=>(
              <div key={i} style={{flex:1,background:"#fff",borderRadius:6,padding:8,border:"1px solid #e0e0e0",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#666"}}>{s.d}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#003C71"}}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>
          <strong style={{color:"#333"}}>Languages:</strong> English, Mandarin &nbsp;|&nbsp;
          <strong style={{color:"#333"}}>Insurance:</strong> Aetna, Blue Cross, Cigna, Medicare, United
        </div>
      </div>
    </div>
    <div style={{background:"#f9f9f9",padding:"12px 24px",borderTop:"1px solid #e8e8e8"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:120,height:70,borderRadius:6,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#3b82f6"}}>📍 Map</div>
        <div style={{fontSize:12,color:"#555"}}>BSW Clinic — 3600 Gaston Ave, Dallas, TX 75246<br/><span style={{color:"#003C71",fontWeight:500}}>Get Directions</span></div>
      </div>
    </div>
  </div>
);

const physicianTextLayer = `Jun Kong, MD

Internal Medicine · Gastroenterology
Accepting New Patients
Video Visits Available

Next available appointments:
  Mon, Jun 16 — 9:30 AM
  Mon, Jun 16 — 2:15 PM
  Tue, Jun 17 — 10:00 AM

Languages: English, Mandarin
Insurance: Aetna, Blue Cross, Cigna, Medicare, United

NPI: 1234567890
Board Certified: American Board of Internal Medicine

BSW Clinic — 3600 Gaston Ave, Dallas, TX 75246
Phone: (214) 820-0111
Fax: (214) 820-0112
Hours: Mon-Fri 8:00 AM - 5:00 PM`;

const physicianHTMLLayer = `<main class="provider-profile">
  <nav class="bsw-header">
    <a href="/" class="logo">Baylor Scott & White</a>
    <ul class="nav-links">
      <li><a href="/doctors">Find a Doctor</a></li>
      <li><a href="/locations">Locations</a></li>
    </ul>
  </nav>

  <section class="provider-hero">
    <img src="/media/providers/jun-kong.jpg"
         alt="Jun Kong, MD" class="provider-photo" />
    <div class="provider-info">
      <h1>Jun Kong, MD</h1>
      <p class="specialty">Internal Medicine · Gastro</p>
      <div class="badges">
        <span class="badge green">Accepting New Patients</span>
        <span class="badge green">Video Visits</span>
      </div>
    </div>
  </section>

  <section class="scheduling-widget"
    data-provider-epic-id="EPRV42819"
    data-department-id="10301022"
    data-visit-types="NEW,RETURN,VIDEO">
    <!-- Epic OpenScheduling embed -->
    <div class="slot" data-time="2026-06-16T09:30">
    <div class="slot" data-time="2026-06-16T14:15">
    <div class="slot" data-time="2026-06-17T10:00">
  </section>

  <section class="insurance-list">
    <!-- Phynd API → insurance[] -->
  </section>

  <section class="location-map"
    data-place-id="ChIJx5DG1a2ZToYR...">
    <!-- Google Maps embed -->
  </section>
</main>`;

const physicianCSSLayer = `.provider-profile {
  font-family: 'Inter', system-ui, sans-serif;
  color: #1a1a2e;
}

.bsw-header {
  background: #003C71;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-hero {
  display: flex;
  gap: 20px;
  padding: 24px;
}

.provider-photo {
  width: 120px;
  height: 140px;
  border-radius: 12px;
  object-fit: cover;
}

.provider-info h1 {
  font-size: 22px;
  font-weight: 700;
  color: #003C71;
}

.scheduling-widget {
  background: #F5F5F5;
  border-radius: 12px;
  padding: 16px;
}

.slot {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
}

.slot:hover {
  border-color: #003C71;
}

.badge.green {
  background: #E8F5E9;
  color: #2E7D32;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}

.location-map {
  height: 200px;
  background: #dbeafe;
}`;

const physicianAPILayer = `╔══════════════════════════════════════════════════╗
║  NETWORK REQUEST LOG — /physician/jun-kong       ║
╚══════════════════════════════════════════════════╝

──── REQUEST 1: Phynd Provider API ────────────────
URL:    https://api.phynd.com/v2/providers/npi/1234567890
Method: GET
Status: 200 OK
Type:   application/json; charset=utf-8
Size:   2,847 bytes
Time:   142ms

{
  "npi": "1234567890",
  "name": { "first": "Jun", "last": "Kong" },
  "degree": "MD",
  "specialties": [
    { "name": "Internal Medicine", "board_certified": true },
    { "name": "Gastroenterology", "board_certified": true }
  ],
  "languages": ["English", "Mandarin"],
  "insurance_accepted": [
    "Aetna", "Blue Cross", "Cigna", "Medicare", "United"
  ],
  "accepting_new_patients": true,
  "video_visits": true,
  "photo_url": "/media/providers/jun-kong.jpg",
  "locations": [
    {
      "name": "BSW Clinic",
      "address": "3600 Gaston Ave, Dallas, TX 75246",
      "phone": "(214) 820-0111",
      "google_place_id": "ChIJx5DG1a2ZToYR..."
    }
  ]
}

──── REQUEST 2: Epic Open Scheduling ──────────────
URL:    https://epicproxy.bswhealth.com/fhir/Slot
        ?provider=EPRV42819&department=10301022
Method: GET     Status: 200 OK
Size:   1,204 bytes    Time: 98ms

{
  "available_slots": [
    { "start": "2026-06-16T09:30", "type": "NEW_PATIENT" },
    { "start": "2026-06-16T14:15", "type": "RETURN" },
    { "start": "2026-06-17T10:00", "type": "VIDEO" }
  ],
  "provider_epic_id": "EPRV42819",
  "department_id": "10301022"
}

──── REQUEST 3: GTM (analytics) ───────────────────
URL:    https://gtm.bswhealth.com/gtm.js?id=GTM-PGCTTH
Method: GET     Status: 200 OK
Size:   84,221 bytes   Time: 45ms`;

const physicianDataLayer = `Table: providers
+──────────+──────────────+──────────────+──────────────────+──────────────+
| npi      | first_name   | last_name    | specialty        | degree       |
+──────────+──────────────+──────────────+──────────────────+──────────────+
| 12345678 | Jun          | Kong         | Internal Med     | MD           |
| 12345679 | Sarah        | Chen         | Cardiology       | MD           |
| 12345680 | Michael      | Torres       | Family Medicine  | DO           |
| 12345681 | Priya        | Patel        | Pediatrics       | MD           |
| 12345682 | James        | Williams     | Orthopedics      | MD           |
+──────────+──────────────+──────────────+──────────────────+──────────────+

Table: appointments (Epic FHIR Slot resource)
+──────────+──────────────────────+───────────────+──────────────+
| slot_id  | start_time           | visit_type    | provider_npi |
+──────────+──────────────────────+───────────────+──────────────+
| SLT-4281 | 2026-06-16T09:30:00  | NEW_PATIENT   | 12345678     |
| SLT-4282 | 2026-06-16T14:15:00  | RETURN        | 12345678     |
| SLT-4283 | 2026-06-17T10:00:00  | VIDEO         | 12345678     |
| SLT-4290 | 2026-06-17T11:00:00  | NEW_PATIENT   | 12345679     |
+──────────+──────────────────────+───────────────+──────────────+

Table: locations
+──────────+──────────────────────+───────────────────────────+──────────+
| loc_id   | name                 | address                   | place_id |
+──────────+──────────────────────+───────────────────────────+──────────+
| LOC-0301 | BSW Clinic Gaston    | 3600 Gaston Ave, Dallas   | ChIJx5D… |
| LOC-0302 | BSW Medical Center   | 1201 Pennsylvania, FW     | ChIJy3F… |
+──────────+──────────────────────+───────────────────────────+──────────+`;

// ── Search page layers (abbreviated) ────────────
const searchVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span></div>
    <div style={{padding:"16px 24px"}}>
      <div style={{fontSize:16,fontWeight:700,color:"#003C71",marginBottom:8}}>Family Medicine Doctors</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["Distance: 25mi","Sort: Next Available","Keyword: Family Medicine"].map(f=><span key={f} style={{fontSize:11,padding:"4px 8px",borderRadius:4,background:"#EDE9FE",color:"#6366F1"}}>{f}</span>)}
      </div>
      {[{n:"Dr. Sarah Chen",s:"Family Medicine",a:"Mon 9:00 AM"},{n:"Dr. Michael Torres",s:"Family Medicine",a:"Tue 10:30 AM"},{n:"Dr. Priya Patel",s:"Family Medicine",a:"Wed 8:00 AM"}].map((d,i)=>(
        <div key={i} style={{display:"flex",gap:12,padding:"12px",borderBottom:"1px solid #eee",alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#6366F1",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{d.n.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{d.n}</div><div style={{fontSize:11,color:"#666"}}>{d.s}</div></div>
          <div style={{fontSize:11,color:"#003C71",fontWeight:500}}>{d.a}</div>
        </div>
      ))}
    </div>
  </div>
);
const searchTextLayer = `Family Medicine Doctors\n\nFilters: Distance 25mi · Sort by Next Available\n\nDr. Sarah Chen — Family Medicine\nNext: Mon 9:00 AM · 3.2 mi\n\nDr. Michael Torres — Family Medicine, DO\nNext: Tue 10:30 AM · 5.1 mi\n\nDr. Priya Patel — Family Medicine\nNext: Wed 8:00 AM · 7.4 mi\n\nShowing 3 of 142 results`;
const searchHTMLLayer = `<main class="doctor-search">\n  <h1>Family Medicine Doctors</h1>\n  <div class="filters">\n    <select name="distance">25mi</select>\n    <select name="sortBy">NextAvailable</select>\n  </div>\n  <div class="results-list"\n    data-api="phynd"\n    data-specialty="family-medicine">\n    <div class="provider-card"\n      data-npi="12345679">\n      <!-- Phynd API hydrated -->\n    </div>\n  </div>\n</main>`;
const searchCSSLayer = `.doctor-search { max-width: 960px; margin: 0 auto; }\n.filters { display: flex; gap: 8px; margin-bottom: 16px; }\n.results-list { display: flex; flex-direction: column; }\n.provider-card {\n  display: flex; gap: 12px;\n  padding: 16px;\n  border-bottom: 1px solid #eee;\n  transition: background 0.15s;\n}\n.provider-card:hover { background: #f9f9f9; }`;
const searchAPILayer = `──── REQUEST 1: Phynd Provider Search ──────────────\nURL:    https://api.phynd.com/v2/providers/search\n        ?specialty=family-medicine&distance=25\n        &sortBy=NextAvailableAppointment\nMethod: GET    Status: 200 OK\nSize:   8,412 bytes    Time: 234ms\n\n{\n  "total": 142,\n  "results": [\n    { "npi": "12345679", "name": "Sarah Chen",\n      "next_available": "2026-06-16T09:00" },\n    { "npi": "12345680", "name": "Michael Torres",\n      "next_available": "2026-06-17T10:30" }\n  ]\n}`;
const searchDataLayer = `Table: provider_search_index\n+──────────+──────────────+──────────────────+──────────+─────────+\n| npi      | name         | specialty        | lat      | lng     |\n+──────────+──────────────+──────────────────+──────────+─────────+\n| 12345679 | Sarah Chen   | Family Medicine  | 32.7767  | -96.797 |\n| 12345680 | M. Torres    | Family Medicine  | 32.7512  | -97.330 |\n| 12345681 | Priya Patel  | Family Medicine  | 32.8998  | -96.858 |\n+──────────+──────────────+──────────────────+──────────+─────────+`;

// ── Location page layers ────────────────────────
const locationVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span></div>
    <div style={{padding:"16px 24px"}}>
      <div style={{fontSize:16,fontWeight:700,color:"#003C71",marginBottom:10}}>Clinics Near You</div>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
          {[{n:"BSW Clinic Gaston",a:"3600 Gaston Ave, Dallas",s:"Walk-ins accepted",h:"Mon-Fri 8-5"},{n:"BSW Urgent Care Greenville",a:"5201 Greenville Ave, Dallas",s:"Open now",h:"7 days 8-8"}].map((c,i)=>(
            <div key={i} style={{padding:10,borderRadius:8,border:"1px solid #e8e8e8"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#003C71"}}>{c.n}</div>
              <div style={{fontSize:11,color:"#666"}}>{c.a}</div>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <span style={{fontSize:10,padding:"2px 6px",borderRadius:3,background:"#E8F5E9",color:"#2E7D32"}}>{c.s}</span>
                <span style={{fontSize:10,color:"#999"}}>{c.h}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{width:160,borderRadius:8,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#3b82f6",flexShrink:0}}>📍 Google Maps</div>
      </div>
    </div>
  </div>
);
const locationTextLayer = `Clinics Near You\n\nBSW Clinic Gaston\n3600 Gaston Ave, Dallas, TX 75246\nWalk-ins accepted · Mon-Fri 8:00 AM - 5:00 PM\nPhone: (214) 820-0111\n\nBSW Urgent Care Greenville\n5201 Greenville Ave, Dallas, TX 75206\nOpen now · 7 days 8:00 AM - 8:00 PM\nPhone: (214) 820-0222\n\nShowing 2 of 744 locations`;
const locationHTMLLayer = `<main class="location-finder">\n  <h1>Clinics Near You</h1>\n  <div class="search-bar">\n    <input type="text" placeholder="ZIP or city" />\n    <select name="radius">25mi</select>\n  </div>\n  <div class="results" data-api="location-geo">\n    <div class="clinic-card"\n      data-place-id="ChIJx5DG1a2ZToYR...">\n      <!-- Location API hydrated -->\n    </div>\n  </div>\n  <div class="map-container"\n    data-maps-api="google-places">\n    <!-- Google Maps embed -->\n  </div>\n</main>`;
const locationCSSLayer = `.location-finder { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n.clinic-card {\n  padding: 12px;\n  border: 1px solid #e8e8e8;\n  border-radius: 8px;\n  transition: box-shadow 0.15s;\n}\n.clinic-card:hover {\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}\n.map-container {\n  height: 400px;\n  border-radius: 12px;\n  overflow: hidden;\n}`;
const locationAPILayer = `──── REQUEST 1: Location Geo API ──────────────────\nURL:    https://api.bswhealth.com/locations/search\n        ?lat=32.7767&lng=-96.7970&radius=25\nMethod: GET    Status: 200 OK\nSize:   12,847 bytes    Time: 189ms\n\n{\n  "total": 744,\n  "results": [\n    {\n      "id": "LOC-0301",\n      "name": "BSW Clinic Gaston",\n      "address": "3600 Gaston Ave, Dallas, TX",\n      "google_place_id": "ChIJx5DG1a2ZToYR...",\n      "walk_in": true,\n      "hours": "Mon-Fri 8:00-17:00",\n      "photo": "bswmedia.blob.core.windows.net/loc-0301.jpg"\n    }\n  ]\n}\n\n──── REQUEST 2: Google Maps Places ─────────────────\nURL:    https://maps.googleapis.com/maps/api/place/details\n        ?place_id=ChIJx5DG1a2ZToYR...\nMethod: GET    Status: 200 OK`;
const locationDataLayer = `Table: locations\n+──────────+──────────────────────+───────────────────────────+──────────+──────+\n| loc_id   | name                 | address                   | walk_in  | type |\n+──────────+──────────────────────+───────────────────────────+──────────+──────+\n| LOC-0301 | BSW Clinic Gaston    | 3600 Gaston Ave, Dallas   | true     | clinic|\n| LOC-0302 | BSW Urgent Care      | 5201 Greenville Ave       | true     | urgent|\n| LOC-0303 | BSW Medical Center   | 1201 Pennsylvania, FW     | false    | hosp |\n+──────────+──────────────────────+───────────────────────────+──────────+──────+`;
