package com.jayfella.terrain;

import com.jme3.app.Application;
import com.jme3.app.SimpleApplication;
import com.jme3.app.state.BaseAppState;
import com.jme3.environment.EnvironmentCamera;
import com.jme3.environment.LightProbeFactory;
import com.jme3.environment.generation.JobProgressAdapter;
import com.jme3.light.DirectionalLight;
import com.jme3.light.LightProbe;
import com.jme3.light.SphereProbeArea;
import com.jme3.math.ColorRGBA;
import com.jme3.math.Vector3f;
import com.jme3.post.FilterPostProcessor;
import com.jme3.post.filters.ToneMapFilter;
import com.jme3.scene.Node;
import com.jme3.scene.Spatial;
import com.jme3.util.SkyFactory;

/**
 * @author Trevor Flynn <trevorflynn@liquidcrystalstudios.com>
 */
public class PbrLighting extends BaseAppState {

    private DirectionalLight dl;
    private SimpleApplication app;
    private FilterPostProcessor fpp;
    private EnvironmentCamera envCam;
    private LightProbe probe;
    private Node world;

    private short renderSteps = 0;
    private int probeRadius = 100;
    private boolean probing = true;

    @Override
    protected void initialize(Application a) {
        app = (SimpleApplication) a;
        app.getViewPort().setBackgroundColor(ColorRGBA.White);
        //Light
        dl = new DirectionalLight();
        dl.setDirection(new Vector3f(-1, -1, -1).normalizeLocal());
        app.getRootNode().addLight(dl);
        dl.setColor(ColorRGBA.White);

        //Filter
        fpp = new FilterPostProcessor(app.getAssetManager());
        fpp.addFilter(new ToneMapFilter(Vector3f.UNIT_XYZ.mult(4.0f)));
        app.getViewPort().addProcessor(fpp);

        Spatial sky = SkyFactory.createSky(app.getAssetManager(), "Textures/test/Path.hdr", SkyFactory.EnvMapType.EquirectMap);
        app.getRootNode().attachChild(sky);

        //Env Cam
        envCam = new EnvironmentCamera(256, new Vector3f(0, 3f, 0));
        app.getStateManager().attach(envCam);

        //LightsDebugState debugState = new LightsDebugState();
        //app.getStateManager().attach(debugState);

        //MaterialDebugAppState debug = new MaterialDebugAppState();
        //debug.registerBinding("Common/MatDefs/Light/PBRLighting.frag", app.getRootNode());
        //debug.registerBinding("Common/ShaderLib/PBR.glsllib", app.getRootNode());
        //getStateManager().attach(debug);

    }

    @Override
    protected void cleanup(Application a) {
        app.getRootNode().removeLight(dl);
        app.getViewPort().removeProcessor(fpp);
        app.getStateManager().detach(envCam);
    }

    @Override
    public void update(float tpf) {
        if (probing) {
            renderSteps++;
            if (renderSteps == 2) { //Give the scene a frame to update
                System.out.println("Starting PBR Probe");
                world = (Node) app.getRootNode().getChild("world");
                world.removeFromParent();
                probe = LightProbeFactory.makeProbe(app.getStateManager().getState(EnvironmentCamera.class), app.getRootNode(), new JobProgressAdapter<LightProbe>() {

                    @Override
                    public void done(LightProbe result) {
                        System.out.println("PBR Probe results in");
                    }
                });
                ((SphereProbeArea) probe.getArea()).setRadius(100);
                app.getRootNode().addLight(probe);
            } else if (renderSteps > 10) {
                app.getRootNode().attachChild(world);
                probing = false;
                renderSteps = 0;
                System.out.println("PBR Probe Done");
            }
        }
    }

    public void reprobe() {
        probing = true;
    }

    public int getProbeRadius() {
        return probeRadius;
    }

    public void setProbeRadius(int probeRadius) {
        this.probeRadius = probeRadius;
    }

    @Override
    protected void onEnable() {
        dl.setEnabled(true);
        envCam.setEnabled(true);
        reprobe();
        app.getViewPort().addProcessor(fpp);
    }

    @Override
    protected void onDisable() {
        dl.setEnabled(false);
        envCam.setEnabled(false);
        app.getViewPort().removeProcessor(fpp);
        if (probe != null) {
            app.getRootNode().removeLight(probe);
        }
    }

}
