uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_WorldMatrix;
uniform mat3 g_NormalMatrix;
in vec3 inPosition;
in vec3 inNormal;

// Trilinear mapping related settings
uniform vec3 m_WorldOffset;
out vec3 worldNormal;
out vec3 texCoord;

#if defined(HAS_COLORMAP) || (defined(HAS_LIGHTMAP) && !defined(SEPARATE_TEXCOORD))
    #define NEED_TEXCOORD8
#endif

#ifdef NEED_TEXCOORD8
    in vec3 inTexCoord8;
    flat out float id;
    out vec3 texCoord8;
#endif



#ifdef SEPARATE_TEXCOORD
    in vec3 inTexCoord2;
    out vec3 texCoord2;
#endif

#ifdef HAS_VERTEXCOLOR
    in vec4 inColor;
    out vec4 vertColor;
#endif



void main(){
    vec4 modelSpacePos = vec4(inPosition, 1.0);
    texCoord = (g_WorldMatrix * modelSpacePos).xyz + m_WorldOffset;
    
    #ifdef NEED_TEXCOORD8
        texCoord8 = inTexCoord8;
        id = inTexCoord8.x;
    #endif

    #ifdef SEPARATE_TEXCOORD
        texCoord2 = inTexCoord2;
    #endif

    #ifdef HAS_VERTEXCOLOR
        vertColor = inColor;
    #endif

    gl_Position = g_WorldViewProjectionMatrix * vec4(inPosition, 1.0);
    
    //
    vec3 modelSpaceNorm = inNormal;
    worldNormal = (g_WorldMatrix * vec4(modelSpaceNorm, 0.0)).xyz;
}

