import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { LiveMap } from './LiveMap';
vi.mock('./GeographicMap',()=>({GeographicMap:({onAreaChange}:any)=><button onClick={()=>onAreaChange({latitude:49.1,longitude:-122.8,radiusKm:2})}>Move map to Surrey</button>}));
afterEach(()=>vi.unstubAllGlobals());
test('searching the moved map uses Surrey coordinates without Vancouver city and retains an empty-area map',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({events:[{id:'van',providerId:'van',name:'Vancouver concert',category:'Music',latitude:49.28,longitude:-123.12,status:'SCHEDULED'}]})).mockResolvedValue(Response.json({events:[]}));
 vi.stubGlobal('fetch',fetch);
 render(<LiveMap location={{city:'Vancouver'}} locationStatus="ready" onChooseLocation={()=>{}} onUseCurrentLocation={()=>{}}/>);
 await screen.findByText('Vancouver concert');
 fireEvent.click(screen.getByText('Move map to Surrey'));fireEvent.click(screen.getByText('Search this area'));
 await screen.findByText(/No events matched this area/);
 const body=JSON.parse(fetch.mock.calls[1][1].body);expect(body.city).toBeUndefined();expect(body.latitude).toBe(49.1);expect(body.longitude).toBe(-122.8);expect(body.radiusKm).toBe(2);expect(screen.getByText('Move map to Surrey')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Music'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));expect(JSON.parse(fetch.mock.calls[2][1].body).latitude).toBe(49.1);
});
