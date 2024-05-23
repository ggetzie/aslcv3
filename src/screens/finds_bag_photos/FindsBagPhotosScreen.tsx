import {Picker} from '@react-native-picker/picker';
import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Divider} from 'react-native-elements';
import {
  CameraOptions,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import {useDispatch, useSelector} from 'react-redux';
import {FindsStackParamList} from '../../../navigation';
import {AslReducerState} from '../../../redux/reducer';
import {SET_SELECTED_SPATIAL_CONTEXT} from '../../../redux/reducerAction';
import CameraModal from '../../components/CameraModal';
import {PaddingComponent} from '../../components/PaddingComponent';
import UploadProgressModal from '../../components/UploadProgressModal';
import {ButtonComponent} from '../../components/general/ButtonComponent';
import LoadingModalComponent, {
  LoadingMessage,
} from '../../components/general/LoadingModalComponent';
import {RowView} from '../../components/general/RowView';
import {ScreenColors} from '../../constants/EnumsAndInterfaces/AppState';
import {
  PhotoDetails,
  Source,
  SpatialContext,
  renderSource,
} from '../../constants/EnumsAndInterfaces/ContextInterfaces';
import {SpatialArea} from '../../constants/EnumsAndInterfaces/SpatialAreaInterfaces';
import {getContextDetail, uploadBagPhoto} from '../../constants/backend_api';
import {nativeColors} from '../../constants/colors';
import {horizontalScale, verticalScale} from '../../constants/nativeFunctions';
import {
  enumToArray,
  getBagPhotoSource,
  getSpatialString,
} from '../../constants/utilityFunctions';
import PhotoGrid from '../../components/PhotoGrid';

type Props = StackScreenProps<FindsStackParamList, 'FindsBagPhotosScreen'>;

const imagePickerOptions: CameraOptions = {
  mediaType: 'photo',
  cameraType: 'back',
  saveToPhotos: false,
};

const FindsBagPhotosScreen = ({navigation}: Props) => {
  const dispatch = useDispatch();

  const selectedContextId: string | null = useSelector(
    ({reducer}: {reducer: AslReducerState}) =>
      reducer.selectedSpatialContext !== null
        ? reducer.selectedSpatialContext.id
        : null,
  );

  const selectedArea: SpatialArea | null = useSelector(
    ({reducer}: {reducer: AslReducerState}) => reducer.selectedSpatialArea,
  );
  const selectedContext: SpatialContext | null = useSelector(
    ({reducer}: {reducer: AslReducerState}) => reducer.selectedSpatialContext,
  );
  const spatialString = getSpatialString(selectedArea, selectedContext);
  const [imagePickStage, setImagePickStage] = useState<boolean>(false);
  const [source, setSource] = useState<Source>(Source.D);

  const [loadingMessage, setLoadingMessage] =
    useState<LoadingMessage>('hidden');
  const [uploadedPct, setUploadedPct] = useState<number>(0);
  const [showUploadProgress, setShowUploadProgress] = useState<boolean>(false);
  const [dryingPhotos, setDryingPhotos] = useState<PhotoDetails[]>([]);
  const [fieldPhotos, setFieldPhotos] = useState<PhotoDetails[]>([]);

  const background = {
    backgroundColor:
      source === Source.D
        ? ScreenColors.BAG_SCREEN_DRYING
        : ScreenColors.BAG_SCREEN_FIELD,
  };

  function refreshContext() {
    if (selectedContext === null) {
      return;
    }
    setLoadingMessage('refreshingContext');
    getContextDetail(selectedContext.id)
      .then(spatialContext => {
        dispatch({type: SET_SELECTED_SPATIAL_CONTEXT, payload: spatialContext});
        setLoadingMessage('hidden');
      })
      .catch(error => {
        console.log(error);
        alert('Error fetching context');
        setLoadingMessage('hidden');
      });
  }

  useEffect(() => {
    if (selectedContext !== null) {
      setDryingPhotos(
        selectedContext.bagphoto_set.filter(
          photo => getBagPhotoSource(photo.photo_url) == Source.D,
        ),
      );
      setFieldPhotos(
        selectedContext.bagphoto_set.filter(
          photo => getBagPhotoSource(photo.photo_url) == Source.F,
        ),
      );
    }
  }, [selectedContext]);

  if (selectedContext === null) {
    return (
      <ScrollView>
        <Text>Please Select a context first</Text>
      </ScrollView>
    );
  }

  async function uploadImage(response: ImagePickerResponse) {
    Alert.alert(
      `Bag Photo Upload - ${renderSource(source)}`,
      'Confirm',
      [
        {
          text: 'Cancel',
          onPress: () => setShowUploadProgress(false),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            setShowUploadProgress(true);
            const form: FormData = new FormData();
            try {
              form.append('photo', {
                uri: response.assets![0].uri,
                type: response.assets![0].type,
                name: response.assets![0].fileName,
              } as any);
              form.append('source', source);
              await uploadBagPhoto(
                form,
                selectedContextId as string,
                ({loaded, total}) =>
                  setUploadedPct(Math.round((loaded * 100) / total)),
              );
              setShowUploadProgress(false);
              setLoadingMessage('refreshingContext');
              setTimeout(refreshContext, 3000);
            } catch (e) {
              alert('Failed to upload image');
              setShowUploadProgress(false);
              setLoadingMessage('hidden');
            }
          },
        },
      ],
      {cancelable: false},
    );
  }

  return (
    <ScrollView style={background}>
      <LoadingModalComponent message={loadingMessage} />
      <UploadProgressModal
        isVisible={showUploadProgress}
        progress={uploadedPct}
        message={`Uploading ${renderSource(source)} bag photo...`}
      />

      <View>
        <CameraModal
          isVisible={imagePickStage}
          onTakePhoto={() => {
            launchCamera(
              imagePickerOptions,
              async (response: ImagePickerResponse) => {
                if (response.didCancel) {
                  setImagePickStage(false);
                } else if (response.errorCode) {
                  alert('Error selecting Image');
                  console.log(response.errorMessage);
                } else {
                  await uploadImage(response);
                }
              },
            );
          }}
          onCancel={() => setImagePickStage(false)}
        />
        <Text
          style={{
            fontSize: verticalScale(20),
            fontWeight: 'bold',
            paddingHorizontal: '5%',
            paddingTop: '5%',
          }}>
          {'Context: ' + spatialString}
        </Text>
        <RowView style={{paddingTop: '2%', justifyContent: 'center'}}>
          <ButtonComponent
            buttonStyle={{
              width: '30%',
              height: 'auto',
              alignSelf: 'flex-end',
              margin: 'auto',
              marginHorizontal: '5%',
            }}
            onPress={refreshContext}
            textStyle={{padding: '4%'}}
            text={'Refresh'}
            rounded={true}
          />
        </RowView>
        <PaddingComponent vertical="2%" />
        <View style={{paddingHorizontal: '5%', paddingVertical: '0%'}}>
          <Divider />
          <PaddingComponent vertical="2%" />
          <RowView style={{paddingVertical: '0%'}}>
            <Text style={Styles.labelStyle}>Source</Text>
            <Picker
              style={Styles.inputStyle}
              selectedValue={source}
              onValueChange={(value: Source, pos) => setSource(value)}>
              {enumToArray<Source>(Source).map((source: Source) => (
                <Picker.Item
                  key={renderSource(source)}
                  label={renderSource(source)}
                  value={source}
                />
              ))}
            </Picker>
          </RowView>
          <ButtonComponent
            buttonStyle={{width: '35%', height: 'auto', alignSelf: 'center'}}
            onPress={() => setImagePickStage(true)}
            textStyle={{padding: '4%'}}
            text={'Add Photo'}
            rounded={true}
          />
          <PaddingComponent vertical="2%" />
          <Divider />
          <PaddingComponent vertical="2%" />
          <RowView>
            <Text style={Styles.labelStyle}>Total Bag Photos</Text>
            <Text>
              {selectedContext.bagphoto_set == null
                ? 0
                : selectedContext.bagphoto_set.length}
            </Text>
          </RowView>
          <PaddingComponent vertical="2%" />
          <RowView style={{justifyContent: 'space-evenly'}}>
            <TouchableOpacity onPress={() => setSource(Source.F)}>
              <View
                style={
                  source === Source.F
                    ? Styles.tabItemSelected
                    : Styles.tabNotSelected
                }>
                <Text style={{alignSelf: 'center'}}>
                  {renderSource(Source.F)} - ({fieldPhotos.length})
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSource(Source.D)}>
              <View
                style={
                  source === Source.D
                    ? Styles.tabItemSelected
                    : Styles.tabNotSelected
                }>
                <Text style={{alignSelf: 'center'}}>
                  {renderSource(Source.D)} - ({dryingPhotos.length})
                </Text>
              </View>
            </TouchableOpacity>
          </RowView>
          <PaddingComponent vertical="2%" />
          <PhotoGrid
            photoList={source === Source.D ? dryingPhotos : fieldPhotos}
            columns={3}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const Styles = StyleSheet.create({
  labelStyle: {
    fontSize: verticalScale(16),
    color: 'black',
    width: '50%',
  },
  inputStyle: {
    width: '50%',
  },
  iconStyle: {
    alignSelf: 'center',
    width: verticalScale(25),
    height: verticalScale(25),
  },
  imageStyle: {
    alignSelf: 'center',
    width: horizontalScale(100),
    height: horizontalScale(100),
    marginHorizontal: horizontalScale(5),
  },
  modalButtonStyle: {
    width: '60%',
  },
  cancelButtonStyle: {
    width: '60%',
    backgroundColor: 'white',
  },
  tabItemSelected: {
    borderBottomWidth: 2,
    borderStyle: 'solid',
    borderBottomColor: nativeColors.lightBrown,
    color: nativeColors.lightBrown,
    fontSize: verticalScale(16),
    height: verticalScale(40),
    width: horizontalScale(100),
  },
  tabNotSelected: {
    color: 'white',
    fontSize: verticalScale(16),
    height: verticalScale(40),
    width: horizontalScale(100),
  },
});

export default FindsBagPhotosScreen;
