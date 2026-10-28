// See-through cutaway: anything standing between the camera and the player
// (trees, cabins, roofs, palisades) is dithered away so the hero is never
// hidden. Patched into every built-in material through onBeforeCompile.
import * as THREE from 'three';

export const CUT = {
  uCutA: { value: new THREE.Vector3() },   // camera position
  uCutB: { value: new THREE.Vector3() },   // point that must stay visible
  uCutR: { value: 1.8 },                   // radius of the see-through tube
  uCutOn: { value: 0 },
};

const VERT_DECL = 'varying vec3 vCutWP;\n';
const VERT_CODE = `#include <project_vertex>
{
  vec4 cutP = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  cutP = instanceMatrix * cutP;
#endif
  vCutWP = ( modelMatrix * cutP ).xyz;
}`;
const FRAG_DECL = `uniform vec3 uCutA;
uniform vec3 uCutB;
uniform float uCutR;
uniform float uCutOn;
varying vec3 vCutWP;
float cutBayer2( vec2 p ) { return mod( 2.0 * p.x + 3.0 * p.y, 4.0 ); }
float cutBayer4( vec2 p ) { p = floor( mod( p, 4.0 ) ); return ( 4.0 * cutBayer2( mod( p, 2.0 ) ) + cutBayer2( floor( p * 0.5 ) ) + 0.5 ) / 16.0; }
`;
const FRAG_CODE = `#include <clipping_planes_fragment>
if ( uCutOn > 0.5 && vCutWP.y > 0.35 ) {
  vec3 cutAB = uCutB - uCutA;
  float cutL = length( cutAB );
  vec3 cutDir = cutAB / cutL;
  float cutT = dot( vCutWP - uCutA, cutDir );
  float cutKeep = cutL - 1.4;
  if ( cutT > 0.0 && cutT < cutKeep ) {
    float cutD = length( vCutWP - ( uCutA + cutDir * cutT ) );
    float cutFade = ( 1.0 - smoothstep( uCutR * 0.4, uCutR, cutD ) ) * smoothstep( cutKeep, cutKeep - 1.2, cutT ) * 0.9;
    if ( cutFade > cutBayer4( gl_FragCoord.xy ) ) discard;
  }
}`;

export function installCutaway() {
  THREE.Material.prototype.onBeforeCompile = function (shader) {
    if (this.userData.noCut || this.isMeshDepthMaterial || this.isMeshDistanceMaterial) return;
    if (!shader.vertexShader.includes('#include <project_vertex>') || !shader.fragmentShader.includes('#include <clipping_planes_fragment>')) return;
    Object.assign(shader.uniforms, CUT);
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', VERT_CODE);
    shader.fragmentShader = FRAG_DECL + shader.fragmentShader.replace('#include <clipping_planes_fragment>', FRAG_CODE);
  };
}

// Materials that must never be cut (carried stacks, the hero) opt out here;
// the cache key keeps three.js from sharing a patched program with them.
export function noCut(material) {
  material.userData.noCut = true;
  material.customProgramCacheKey = () => 'nocut';
  return material;
}
