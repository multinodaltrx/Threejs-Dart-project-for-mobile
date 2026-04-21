varying vec3 vLocalPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    // Pass local position to fragment shader for localized raymarching
    vLocalPosition = position;
    
    // Calculate normal and view direction for Fresnel edge glow
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
